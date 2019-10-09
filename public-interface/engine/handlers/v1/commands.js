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
var commandsApi = require('../../api/v1/commands'),
    httpStatuses = require('../../res/httpStatuses'),
    errBuilder = require("../../../lib/errorHandler/index").errBuilder,
    errors = require('../../../lib/errorHandler/index').errBuilder.Errors;

var simpleHandler = function (res, next) {
    return function (err) {
        if (!err) {
            res.status(httpStatuses.OK.code).send();
        } else {
            next(err);
        }
    };
};

var command = function (req, res, next) {
    var commandParameters = req.body.commands;
    var accountId = req.params.accountId;
    commandsApi.command(accountId, commandParameters, req.body.complexCommands, simpleHandler(res, next));
};

var addComplexCommand = function (req, res, next) {
    var commands = req.body.commands;
    var accountId = req.params.accountId;
    var name = req.params.commandName;

    return commandsApi.addComplexCommand(accountId, name, commands, simpleHandler(res, next));
};

var updateComplexCommand = function (req, res, next) {
    var commands = req.body.commands;
    var accountId = req.params.accountId;
    var name = req.params.commandName;

    return commandsApi.updateComplexCommand(accountId, name, commands, simpleHandler(res, next));
};

var getComplexCommands = function (req, res, next) {
    var accountId = req.params.accountId;

    return commandsApi.getComplexCommands(accountId, function (err, foundCommands) {
        if (err) {
            next(err);
        } else {
            res.status(httpStatuses.OK.code).send(foundCommands);
        }
    });
};

var deleteComplexCommand = function (req, res, next) {
    var accountId = req.params.accountId;
    var name = req.params.commandName;

    commandsApi.deleteComplexCommand(accountId, name, function (err) {
        if (err) {
            next(err);
        } else {
            res.status(httpStatuses.DeleteOK.code).send(httpStatuses.DeleteOK.message);
        }
    });
};

var getCommands = function (req, res, next) {
    var accountId = req.params.accountId;
    var deviceId = req.params.deviceId;
    var from = req.query.from;
    var to = req.query.to;

    if (!accountId || !deviceId) {
        next(errBuilder.build(errors.Generic.InvalidRequest));
        return;
    }

    if ((from && isNaN(from)) || (to && isNaN(to))) {
        next(errBuilder.build(errors.Generic.InvalidRequest));
        return;
    }

    var dateFilterParams = {
        from: isNaN(from) ? 0 : parseInt(from),
        to: isNaN(to) ? undefined : parseInt(to)
    };

    return commandsApi.getActuations(accountId, deviceId, dateFilterParams)
        .then(function (actuations) {
            res.status(httpStatuses.OK.code).send( actuations);
        })
        .catch(function(err) {
            next(err);
        });
};

module.exports = {
    command: command,
    addComplexCommand: addComplexCommand,
    updateComplexCommand: updateComplexCommand,
    getComplexCommands: getComplexCommands,
    getCommands: getCommands,
    deleteComplexCommand: deleteComplexCommand
};
