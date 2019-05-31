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
        cb(res, Object.keys(result.payload.accounts));
    });
}

function verifySuggestion(res, accounts) {
    for (var i = 0; i < res.length; i++) {
        var splitted = res[i].split(".");
        if (accounts.indexOf(splitted[0]) === -1) {
            res.splice(i, 1);
            i--;
        }
    }
}

function verifyQuery(res, accounts) {
    for (var i = 0; i < res.length; i++) {
        var splitted = res[i].metric.split(".");
        if (accounts.indexOf(splitted[0]) === -1) {
            while (res.length !== 0) {
                res.pop();
            }
            break;
        }
    }
}

proxy.on('proxyRes', function (proxyRes, req, res) {
    modifyResponse(res, proxyRes, function(body) {
        if (body) {
            if (req.url.indexOf(SUGGESTION_PATH) !== -1) {
                verifyResponse(req.cookies.jwt, body, verifySuggestion);
            } else if (req.url.indexOf(QUERY_PATH) !== -1) {
                verifyResponse(req.cookies.jwt, body, verifyQuery);
                if (body.length === 0) {
                    res.statusCode = 400;
                }
            }
        }
        return body;
    });
});

app.all('(/*)?', function (req, res) {
    if (req.cookies.jwt) {
        tokenInfo(req.cookies.jwt, null, function() {
            proxy.web(req, res, {
                target: dataSourceAddress,
            });
        });
    } else {
        res.sendStatus(401);
    }
});

module.exports = app;
