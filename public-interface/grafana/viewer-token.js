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

function getViewerToken(forceRefresh = false) {
    if (viewerToken && !forceRefresh) {
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
                },
                simple: false,
                resolveWithFullResponse: true
            };
            return request(options).then(res => {
                if (res.statusCode !== 200) {
                    if (res.statusCode < 500) {
                        throw 'API Token already taken and can not delete it';
                    }
                    return null;
                }
                return getViewerToken();
            });
        })
        .catch(err => {
            logger.error("Could not get API Token from Grafana:\n" +
                JSON.stringify(err));
        });
}

module.exports = getViewerToken;
