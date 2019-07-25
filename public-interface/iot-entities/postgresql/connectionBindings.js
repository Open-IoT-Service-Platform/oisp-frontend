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

"use strict";
var connectionBindings = require('./models').connectionBindings,
    Q = require('q');

var TYPE = {
    MQTT: 'mqtt',
    WEBSOCKET: 'ws'
};

exports.TYPE = TYPE;

exports.find = function(deviceId, type) {
    var filter = {
        where: {
            deviceId: deviceId,
            type: type
        }
    };

    return connectionBindings.findOne(filter);
};

exports.findLatestConnection = function(deviceId) {
    var filter = {
        where: {
            deviceId: deviceId,
        },
        order: [['lastConnectedAt', 'ASC']],
        limit: 1
    };

    return connectionBindings.findOne(filter)
        .then(result => {
            if (result) {
                return Q.resolve(result);
            }
            return null;
        });
};
