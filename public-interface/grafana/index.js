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

const OPENTSDB = 'opentsdb',
    KAIROSDB = 'kairosdb',
    grafanaConf = require('./../config').grafana,
    getViewerToken = require('./viewer-token'),
    reverseProxyGrafana = require('./reverse-proxy-grafana');

var reverseProxyDataSource;

switch (grafanaConf.dataSource) {
case KAIROSDB:
    reverseProxyDataSource = require('./reverse-proxy-kairosdb');
    break;
case OPENTSDB:
default:
    reverseProxyDataSource = require('./reverse-proxy-opentsdb');
}

module.exports = {
    reverseProxyGrafana: reverseProxyGrafana,
    reverseProxyDataSource: reverseProxyDataSource,
    getViewerToken: getViewerToken
};
