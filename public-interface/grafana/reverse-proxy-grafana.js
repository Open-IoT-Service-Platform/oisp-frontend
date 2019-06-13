var express = require('express'),
    cookieParser = require('cookie-parser'),
    tokenInfo = require('./../lib/security').authorization.tokenInfo,
    httpProxy = require('http-proxy'),
    grafanaConf = require('./../config').grafana,
    viewerToken = require('./viewer-token');

const urlRegex =  new RegExp('^/ui/' + grafanaConf.host, 'gm'),
    app = express(),
    proxy = httpProxy.createProxyServer({}),
    grafanaAddress = 'http://' + grafanaConf.host + ':' + grafanaConf.port;

app.use(cookieParser());

proxy.on('proxyReq', function(proxyReq, req) {
    // Rewrite body to pass POST and PUT requests
    if (req.body) {
        const bodyData = JSON.stringify(req.body);
        // incase if content-type is application/x-www-form-urlencoded
        // -> we need to change to application/json
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        // stream the content
        proxyReq.write(bodyData);
    }
});

proxy.on('error', function(err, req, res) {
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    });
    res.end('Can\'t reach to grafana');
});

app.all('(/*)?', function (req, res) {
    req.url = req.url.replace(urlRegex, '');
    if (req.cookies.jwt) {
        tokenInfo(req.cookies.jwt, null, function(result) {
            if (result) {
                viewerToken().then(token => {
                    req.headers.Authorization = "Bearer " + token;
                    proxy.web(req, res, { target: grafanaAddress });
                });
            } else {
                proxy.web(req, res, { target: grafanaAddress });
            }
        });
    } else {
        proxy.web(req, res, { target: grafanaAddress });
    }
});



module.exports = app;
