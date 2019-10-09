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

var MQTTConnector = require('./../../../lib/mqtt/connector'),
    logger = require('../../../lib/logger').init(),
    postgresProvider = require('../../../iot-entities/postgresql'),
    connectionBindings = postgresProvider.connectionBindings;

module.exports = function(config) {

    var connectors = {};
    var brokers = config.controlChannel.mqtt;

    for(var brokerId in brokers) {
        connectors[brokerId] = new MQTTConnector.Broker(brokers[brokerId], logger);
    }

    return {
        execute: function(data, done) {

            var re = /{\w+}/;
            var deviceUID = data.content.deviceUID;

            connectionBindings.find(deviceUID, connectionBindings.TYPE.MQTT)
                .then(function (bind) {
                    if (!bind || !bind.broker) {
                        throw new Error('Device is not using MQTT');
                    }
                    logger.debug("Device " + bind.deviceUID + " was connected last time to " + bind.broker + " broker");
                    var selectedBroker = config.controlChannel.mqtt[bind.broker];
                    if (bind.broker in connectors && selectedBroker.topic) {
                        var topic = selectedBroker.topic.replace(re, data.content.gatewayId);
                        var message = data;
                        logger.info("Sending message to MQTT. Topic:" + topic);
                        var connector = connectors[bind.broker];
                        connector.publish(topic, message);
                    } else {
                        logger.info("Not sending message to MQTT. Device:" + deviceUID +
                            " is subscribed to a broker " + bind.broker + " which is not specified in config file");
                    }
                })
                .catch(function(err) {
                    // If device is not connected to MQTT, we do not send actuation anywhere
                    logger.debug("Not sending message to MQTT. Device is not using MQTT:" + deviceUID + ', err: ' + JSON.stringify(err));
                })
                .finally(function() {
                    done();
                });
        }
    };
};
