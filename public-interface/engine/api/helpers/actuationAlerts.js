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

var postgresProvider = require('../../../iot-entities/postgresql'),
    Device = postgresProvider.devices,
    ComplexCommand = postgresProvider.complexCommands,
    Actuations = postgresProvider.actuations,
    WsBindings = require('../../../iot-entities/redis').InitProvider().WsBindings,
    connectionBindings = postgresProvider.connectionBindings,
    async = require('async'),
    Q = require('q'),
    logger = require('../../../lib/logger').init(),
    commands = require('../v1/commands');

var ACTUATION_TYPE = 'actuation';

/**
 * Returns protocol, which should be used for sending actuation. It compares device last connection time and select
 * protocol which was used recently. If there is no info about device connection status, method throws Error.
 * @param deviceId
 * @returns {*}
 */
var getProtocolForActuation = function (deviceId) {
    return WsBindings.getServerAddress(deviceId)
        .then(reply => {
            if (reply) {
                return Q.resolve({ type: connectionBindings.TYPE.WEBSOCKET });
            } else {
                return connectionBindings.findLatestConnection(deviceId);
            }
        })
        .then(connectionBinding => {
            if (connectionBinding) {
                return Q.resolve(connectionBinding.type);
            } else {
                throw new Error('Unable to get connection status for device - ' + deviceId);
            }
        })
        .catch(err => {
            logger.warn(err);
            logger.warn('Unable to get connection status for device - ' + deviceId);
            return null;
        });
};

var addNewActuation = function (messageContent, resultCallback) {
    var data = {
        created: new Date(),
        transport: messageContent.transport || "auto",
        deviceId: messageContent.deviceId,
        gatewayId: messageContent.gatewayId,
        componentId: messageContent.componentId,
        command: messageContent.command,
        parameters: messageContent.params,
        accountId: messageContent.domainId
    };
    Actuations.new(data, resultCallback);
};

/**
 * Add new actuation for actions with type - 'actuation'. Actuations are created based on action.message.content
 * field.
 */
var saveAlertActuations = function (actions, resultCallback) {

    async.parallel(actions.map(function (action) {
        return function (actionsCallback) {
            if (action.type === ACTUATION_TYPE && action.messages) {
                async.parallel(action.messages.map(function (message) {
                    return function (actuationCallback) {
                        addNewActuation(message.content, actuationCallback);
                    };
                }), function (err) {
                    actionsCallback(err);
                });
            } else {
                actionsCallback(null);
            }
        };
    }), function (err) {
        if (err) {
            resultCallback(err);
        } else {
            resultCallback(null);
        }
    });
};

/**
 * It creates actuation message for each command in complexCommands list. If there is no information about device connection
 * status actuation message will not be created.
 * @param accountId
 * @param complexCommands
 * @returns {Promise|*}
 */
var parseComplexCommandToActuationMessage = function (accountId, complexCommands) {
    if (complexCommands && complexCommands.commands) {
        var commandsMessages = [];
        var deferred = Q.defer();
        var parseAllCommands = complexCommands.commands.map(function (command) {
            return Q.nfcall(Device.findByAccountIdAndComponentId, accountId, command.componentId)
                .then(function deviceFound(device) {

                    return getProtocolForActuation(device.deviceId)
                        .then(function (protocol) {
                            var message = {
                                type: commands.MESSAGE_TYPE_COMMAND,
                                transport: protocol,
                                content: {
                                    transport: protocol,
                                    domainId: accountId,
                                    deviceId: device.deviceId,
                                    gatewayId: device.gatewayId,
                                    componentId: command.componentId,
                                    command: device.components[0].componentType.command.commandString,
                                    params: command.parameters
                                }
                            };
                            commandsMessages.push(message);
                        })
                        /*jshint -W098 */
                        .catch(function (err) {
                            logger.error('actuationAlerts - unable to get information about connection status for device - ' + device.deviceId +
                            '. Alert actuation command will not be send.');
                        });
                    /*jshint +W098 */
                });
        });

        return Q.all(parseAllCommands)
            .then(function parsed() {
                deferred.resolve(commandsMessages);
                return deferred.promise;
            });
    } else {
        throw new Error('Wrong complexCommands format.');
    }
};

/**
 * For each action with type - 'actuation', method is adding an array of messages. Messages array contains
 * a set of actuation commands, which are composed based on complexCommands.
 * @param accountId - id of an account, for which alert was triggered
 * @param rule - rule with alert actions
 */
var addCommandsToActuationActions = function (accountId, rule) {
    var messages = [];

    var allCommandsForAction = rule.actions.map(function (action) {
        if (action.type === ACTUATION_TYPE) {
            return Q.all(action.target.map(function (commandId) {
                return Q.nfcall(ComplexCommand.findByAccountAndId, accountId, commandId)
                    .then(function success(complexCommand) {
                        return parseComplexCommandToActuationMessage(accountId, complexCommand)
                            .then(function parsed(message) {
                                messages = messages.concat(message);
                            });
                    });
            }))
                .then(function commandsFound() {
                    action.messages = messages.slice();
                    messages.length = 0;
                });
        } else {
            return new Q();
        }
    });

    return Q.all(allCommandsForAction);
};

module.exports = {
    addCommandsToActuationActions: addCommandsToActuationActions,
    saveAlertActuations: saveAlertActuations
};
