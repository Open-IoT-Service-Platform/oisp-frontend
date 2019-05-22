/**
 * Copyright (c) 2014 Intel Corporation
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

'use strict';

var WSConnector = require('./../../../lib/websocket/connector'),
    logger = require('../../../lib/logger').init(),
    WsBindings = require('../../../iot-entities/redis').InitProvider().WsBindings,
    config = require('../../../config');

var getPort = function(serverId) {
    return serverId.split(':')[1];
};

var getHost = function(serverId) {
    return serverId.split(':')[0];
};
var getConnectionConf = function(serverId) {
    var wsConfig = config.controlChannel.ws;
    wsConfig.host = getHost(serverId);
    wsConfig.port = getPort(serverId);

    return wsConfig;
};

var connectWithWebsocket = function (serverId) {
    var connectionConfig = getConnectionConf(serverId);
    logger.debug('Connecting with Websocket server: ' +
        JSON.stringify(connectionConfig));
    return new WSConnector.WebSocketClient(connectionConfig, logger);
};

module.exports = function() {

    return {
        execute: function (message, done) {
            var deviceId = message.content.deviceId;
            WsBindings.getServerAddress(deviceId)
                .then(server => {
                    if (!server) {
                        throw ('Device is not using WS: ' + deviceId);
                    }
                    logger.debug("Device " + deviceId + " was connected last " +
                        "time to " + server + " websocket server");
                    logger.info("Sending message to Websocket. Message: " +
                        JSON.stringify(message));
                    var connector = connectWithWebsocket(server);
                    connector.publish(message);
                    done();
                })
                .catch(err => {
                    logger.info(err);
                    logger.info("Can't connect with redis client");
                    done();
                })
                .done();
        }
    };
};
