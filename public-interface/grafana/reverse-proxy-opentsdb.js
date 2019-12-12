var express = require('express'),
    cookieParser = require('cookie-parser'),
    tokenInfo = require('./../lib/security').authorization.tokenInfo,
    httpProxy = require('http-proxy'),
    modifyResponse = require('node-http-proxy-json'),
    grafanaConf = require('./../config').grafana;

const SUGGESTION_PATH = "/api/suggest",
    QUERY_PATH = "/api/query",
    app = express(),
    proxy = httpProxy.createProxyServer({}),
    dataSourceAddress = 'http://' + grafanaConf.dataSourceHost + ':' +
        grafanaConf.dataSourcePort;

app.use(cookieParser());

function verifyResponse(jwt, res, cb) {
    return tokenInfo(jwt, null, function(result) {
        return cb(res, result.payload.accounts);
    });
}

function getAccountMatcher(accountId) {
    return account => account.id === accountId;
}

function verifySuggestion(res, accounts) {
    for (var i = 0; i < res.length; i++) {
        var splitted = res[i].split(".");
        var isAllowed = accounts.some(getAccountMatcher(splitted[0]));
        if (!isAllowed) {
            res.splice(i, 1);
            i--;
        }
    }
    return Promise.resolve(res);
}

function verifyQuery(res, accounts) {
    for (var i = 0; i < res.length; i++) {
        var splitted = res[i].metric.split(".");
        var isAllowed = accounts.some(getAccountMatcher(splitted[0]));
        if (!isAllowed) {
            return Promise.resolve([]);
        }
    }
    return Promise.resolve(res);
}

proxy.on('proxyRes', function (proxyRes, req, res) {
    modifyResponse(res, proxyRes, function(body) {
        if (body) {
            if (req.url.indexOf(SUGGESTION_PATH) !== -1) {
                return verifyResponse(req.cookies.jwt, body, verifySuggestion);
            } else if (req.url.indexOf(QUERY_PATH) !== -1) {
                return verifyResponse(req.cookies.jwt, body, verifyQuery).then(d => {
                    if (d.length === 0) {
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
    res.end('Can\'t reach to datasource');
});

app.all('(/*)?', function (req, res) {
    if (req.cookies.jwt) {
        tokenInfo(req.cookies.jwt, null, function(result) {
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
