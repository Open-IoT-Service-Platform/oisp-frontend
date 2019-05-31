var request = require('request-promise'),
    logger = require('./../lib/logger').init(),
    grafanaConf = require('./../config').grafana,
    uuid = require('node-uuid');

const KEY_NAME = 'grafana-viewer-key:' + uuid.v4(),
    ROLE = 'Viewer',
    HTTP = 'http://',
    BASIC_AUTH = grafanaConf.adminUser + ':' + grafanaConf.adminPassword + '@',
    HOST_PORT = 'localhost:' + grafanaConf.proxyPort, // address of frontend
    PATH_TO_GRAFANA = '/ui/' + grafanaConf.host,
    API_KEY_PATH = '/api/auth/keys';

// singleton
var viewerToken;

function createViewerToken() {
    if (viewerToken) {
        return Promise.resolve(viewerToken);
    } else {
        var reqBody = {
            name: KEY_NAME,
            role: ROLE,
        };
        var options = {
            url: HTTP + BASIC_AUTH + HOST_PORT + PATH_TO_GRAFANA + API_KEY_PATH,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reqBody)
        };
        return request(options).then(res => {
            viewerToken = JSON.parse(res).key;
            return viewerToken;
        }).catch(err => {
            logger.error('Cannot create Grafana API Token:\n' + err);
            return null;
        });
    }
}

function refreshViewerToken() {
    if (viewerToken) {
        return Promise.resolve(viewerToken);
    }
    return createViewerToken()
        .then(token => {
            if (token) {
                logger.info("Got API Token from Grafana");
                return token;
            }
            var options = {
                url: HTTP + BASIC_AUTH + HOST_PORT + PATH_TO_GRAFANA +
                    API_KEY_PATH + '/' + KEY_NAME,
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            return request(options).then(res => {
                if (res.statusCode !== 200) {
                    throw 'API Token already taken and can not delete it';
                }
                return refreshViewerToken();
            });
        })
        .catch(err => {
            logger.error("Could not get API Token from Grafana:\n" +
                JSON.stringify(err));
        });
}

module.exports = refreshViewerToken;
