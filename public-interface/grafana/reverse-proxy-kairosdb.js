/**
 * Copyright (c) 2020 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var express = require('express'),
    cookieParser = require('cookie-parser'),
    tokenInfo = require('./../lib/security').authorization.tokenInfo,
    secUtils = require('./../lib/security/utils'),
    httpProxy = require('http-proxy'),
    modifyResponse = require('node-http-proxy-json'),
    grafanaConf = require('./../config').grafana;

const SUGGESTION_PATH = '/metricnames',
    QUERY_TAGS_PATH = '/datapoints/query/tags',
    QUERY_PATH = '/datapoints/query',
    app = express(),
    proxy = httpProxy.createProxyServer({}),
    dataSourceAddress = 'http://' + grafanaConf.dataSourceHost + ':' +
        grafanaConf.dataSourcePort;

app.use(cookieParser());

function verifyResponse(req, res, cb) {
    var token = req.cookies.jwt || secUtils.getBearerToken(req.headers.authorization);
    return tokenInfo(token, null, function(result) {
        return cb(res, result.payload.accounts);
    });
}

function getAccountMatcher(accountId) {
    return account => account.id === accountId;
}

function verifySuggestion(res, accounts) {
    for (var i = 0; i < res.results.length; i++) {
        var splitted = res.results[i].split(".");
        var isAllowed = accounts.some(getAccountMatcher(splitted[0]));
        if (!isAllowed) {
            res.results.splice(i, 1);
            i--;
        }
    }
    return Promise.resolve(res);
}

function verifyQuery(res, accounts) {
    var isAllowed = res.queries.every(query => {
        return query.results.every(result => {
            var splitted = result.name.split('.');
            return accounts.some(getAccountMatcher(splitted[0]));
        });
    });
    if (isAllowed) {
        return Promise.resolve(res);
    }
    return Promise.resolve(null);
}


proxy.on('proxyRes', function (proxyRes, req, res) {
    modifyResponse(res, proxyRes, function(body) {
        if (proxyRes.statusCode >= 300) {
            return body;
        }
        if (body) {
            if (req.url.indexOf(SUGGESTION_PATH) !== -1) {
                return verifyResponse(req, body, verifySuggestion);
            } else if (req.url.indexOf(QUERY_TAGS_PATH) !== -1) {
                return verifyResponse(req, body, verifyQuery).then(d => {
                    if (!d) {
                        res.statusCode = 400;
                    }
                    return d;
                });
            } else if (req.url.indexOf(QUERY_PATH) !== -1) {
                return verifyResponse(req, body, verifyQuery).then(d => {
                    if (!d) {
                        res.statusCode = 400;
                    }
                    return d;
                });
            }
        }
        return body;
    });
});

proxy.on('error', function(err, req, res) {
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    });
    if (typeof err !== 'string' ) {
        err = JSON.stringify(err);
    }
    res.end('Can\'t reach to datasource: ' + err);
});

app.all('(/*)?', function (req, res) {
    if (req.cookies.jwt || req.headers.authorization) {
        var token = req.cookies.jwt || secUtils.getBearerToken(req.headers.authorization);
        tokenInfo(token, null, function(result) {
            if (result) {
                proxy.web(req, res, {
                    target: dataSourceAddress,
                });
            } else {
                res.sendStatus(401);
            }
        });
    } else {
        res.sendStatus(401);
    }
});

module.exports = app;
