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
var
    postgresProvider = require('../../../iot-entities/postgresql'),
    Actuations = postgresProvider.actuations,
    Device = postgresProvider.devices,
    complexCommand = postgresProvider.complexCommands,
    errBuilder = require("../../../lib/errorHandler/index").errBuilder,
    async = require('async'),
    logger = require('../../../lib/logger').init(),
    config = require('../../../config'),
    Q = require('q'),
    dateUtil = require('../../../lib/dateUtil');

var MESSAGE_TYPE_COMMAND = "command";

function getComponentsInfo(accountId, commands, resultCallback){
    //find associated devices for each component in the list
    async.map(commands, function(command, mapCallback) {
        return Q.nfcall(Device.findByAccountIdAndComponentId, accountId, command.componentId)
            .then(function (device) {
                command.gatewayId = device.gatewayId;
                command.deviceUID = device.uid;
                command.deviceId = device.deviceId;
                command.component  = device.components[0].componentType;
                mapCallback(null, command);
            })
            .catch(function () {
                //Error if there is no device associated with the componentId and no componentType associated with component
                mapCallback(errBuilder.build(errBuilder.Errors.ComponentCommands.NotFound, ["Component " + command.componentId + " not found"]));
            });
    }, function (err, commandsWithComponentsList) {
        resultCallback(err, commandsWithComponentsList);
    });
}

function validateParams(commandsWithComponentsList, validationCallback) {

    //All components must support all sent parameters and values
    var errors = [];

    commandsWithComponentsList.forEach(function (command) {
        command.parameters.forEach(function (parameter) {
            if (!command.component.command || //Is not an actuator component
                !command.component.command.parameters || //The actuator does not define parameters
                !Array.isArray(command.component.command.parameters) || //The actuator parameters are bad defined
                !command.component.command.parameters.some(function (actuatorParam) { //Some sent parameter in the command is not supported by the actuator
                    //The parameter name is not supported by the actuator
                    if (actuatorParam.name !== parameter.name) {
                        return false;
                    }

                    //The actuator values values are not defined
                    if (!actuatorParam.values) {
                        return false;
                    }

                    var min, max, valuesArray;
                    var matches = actuatorParam.values.match(/-/g);
                    var range = actuatorParam.values.split("-");
                    if (matches && matches.length === 1 && !isNaN(range[0]) && !isNaN(range[1])) {
                        //the valid values are defined by a range
                        min = parseFloat(range[0]);
                        max = parseFloat(range[1]);
                        var parameterValue = parseFloat(parameter.value);

                        //validate range
                        if (isNaN(min) || parameterValue < min ||
                            isNaN(max) || parameterValue > max) {
                            return false;
                        }
                    } else {
                        //the valid values are defined by a list of values (or a single value)
                        valuesArray = actuatorParam.values.split(",");

                        if (valuesArray.indexOf(parameter.value) === -1) {
                            return false;
                        }
                    }
                    return true;
                })) {
                errors.push(errBuilder.build(errBuilder.Errors.ComponentCommands.InvalidValue, "The following component does not support value (" + parameter.value + ") for '" + parameter.name + "': " + command.componentId + " (" + command.component.id + ")"));
            }
        });

    });

    validationCallback(errors.length > 0 ? errors[0] : null);
}

var addNewActuation = function (command, accountId, resultCallback) {
    var data = {
        created: new Date(),
        transport: command.transport || "auto",
        deviceId: command.deviceId,
        gatewayId: command.gatewayId,
        componentId: command.componentId,
        command: command.component.command.commandString,
        parameters: command.parameters,
        accountId: accountId
    };
    Actuations.new(data, resultCallback);
};

var command = function (accountId, commands, complexCommands, resultCallback) {

    var sendCommand = function (command) {
        var message = {
            type: MESSAGE_TYPE_COMMAND,
            transport: command.transport,
            content: {
                accountId: accountId,
                deviceUID: command.deviceUID,
                deviceId: command.deviceId,
                gatewayId: command.gatewayId,
                componentId: command.componentId,
                command: command.component.command.commandString,
                params: command.parameters
            }
        };

        process.emit("incoming_message", message);
    };

    var saveActuations = function (commandsWithComponentsList, resultCallback) {
        async.parallel(commandsWithComponentsList.map(function (command) {
            return function (parallelCallback) {
                addNewActuation(command, accountId, parallelCallback);
            };
        }), function (err) {
            if (err) {
                logger.error('commands.addNewActuationMessage - unable to add new actuation message into DB: ' + JSON.stringify(err));
                resultCallback(errBuilder.build(errBuilder.Errors.Actuation.SavingError));
            } else {
                resultCallback(null);
            }
        });
    };

    async.concat(complexCommands,
        function (complexCmdId, cb) {
            complexCommand.findByAccountAndId(accountId, complexCmdId, function (err, foundCmd) {
                if (err) {
                    cb(err, null);
                }
                else if (!foundCmd) {
                    cb(errBuilder.build(errBuilder.Errors.ComplexCommand.DoesNotExist));
                } else {
                    cb(null, foundCmd.commands);
                }
            });
        },
        function (err, foundCommands) {
            if (err) {
                resultCallback(err);
                return;
            }

            //Get information from catalog
            getComponentsInfo(accountId, commands.concat(foundCommands), function (err, commandsWithComponentsList) {
                if (err) {
                    resultCallback(err);
                    return;
                }
                //Validate params and params values are supported
                validateParams(commandsWithComponentsList, function (err) {
                    if (err) {
                        resultCallback(err);
                    } else {
                        commandsWithComponentsList.forEach(sendCommand);
                        saveActuations(commandsWithComponentsList, resultCallback);
                    }
                });
            });
        }
    );
};

var getComplexCommands = function (accountId, cb) {
    return complexCommand.findAllByAccount(accountId)
        .nodeify(cb);
};

var deleteComplexCommand = function (accountId, name, resultCallback) {
    return complexCommand.delete(accountId, name)
        .nodeify(resultCallback);
};

var addComplexCommand = function (accountId, name, commands, resultCallback) {
    return complexCommand.insert({ accountId: accountId, id: name, commands: commands})
        .catch(function (err) {
            if (err && err.code) {
                throw err;
            }
            else {
                throw errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            }
        })
        .nodeify(resultCallback);
};

var updateComplexCommand = function (accountId, name, commands, resultCallback) {
    //Get information from catalog
    logger.debug("updating complex command " + name + ": " + commands);
    return complexCommand.update({
        accountId: accountId,
        id: name,
        commands: commands
    })
        .catch(function (err) {
            if (err && err.code) {
                throw err;
            }
            else {
                throw errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            }
        })
        .nodeify(resultCallback);
};

var parseDatesFromRequest = function (dateFilterParams) {
    var dateFilter = dateUtil.extractFromAndTo(dateFilterParams);

    dateFilter.from = new Date(dateFilter.from);
    dateFilter.to = new Date(dateFilter.to);

    return dateFilter;
};

var getActuations = function (accountId, deviceId, dateFilterParams) {
    var limit = config.actuation.limitPerRequest;
    var dateFilter = parseDatesFromRequest(dateFilterParams);
    return Q.nfcall(Actuations.findByDeviceId, accountId, deviceId, limit, dateFilter)
        .catch(function (err) {
            logger.error('commands.getActuations - unable to find actuations for device: ' + deviceId + ', err: ' + JSON.stringify(err));
            throw (err || errBuilder.build(errBuilder.Errors.Actuation.SearchError));
        });
};

module.exports = {
    MESSAGE_TYPE_COMMAND: MESSAGE_TYPE_COMMAND,
    command: command,
    addComplexCommand: addComplexCommand,
    updateComplexCommand: updateComplexCommand,
    getComplexCommands: getComplexCommands,
    deleteComplexCommand: deleteComplexCommand,
    getActuations: getActuations
};
