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

var errBuilder = require("./../../lib/errorHandler").errBuilder,
    deviceComponents = require('./models').deviceComponents,
    componentTypes = require('./models').componentTypes,
    deviceTags = require('./models').deviceTags,
    devices = require('./models').devices,
    interpreterHelper = require('../../lib/interpreter/helper'),
    interpreter = require('../../lib/interpreter/postgresInterpreter').deviceComponents(),
    Sequelize = require('sequelize');

const Op = Sequelize.Op;

var filterByAccountId = function(accountId) {
    return {
        include: [
            { model: componentTypes, as: 'componentType' },
            {
                model: devices,
                where: {
                    [Op.and]: {
                        accountId: accountId
                    }
                },
                attributes: []
            }
        ],
        order: [
            ['created', 'ASC'],
            [{ model: componentTypes, as: 'componentType'}, 'created', 'ASC'],
            [devices, 'created', 'ASC']
        ]
    };
};

exports.all = function (accountId, resultCallback) {
    var filter = filterByAccountId(accountId);
    deviceComponents.findAll(filter)
        .then(function (result) {
            interpreterHelper.mapAppResults(result, interpreter, resultCallback);
        })
        .catch (function(err) {
            resultCallback(err);
        });
};

var filterByDeviceProperties = function (customFilter, filter) {
    if (customFilter.deviceNames) {
        filter.include[1].where[Op.and].name = {
            [Op.in]: customFilter.deviceNames
        };
    }
    if (customFilter.deviceIds) {
        filter.include[1].where[Op.and].id = {
            [Op.in]: customFilter.deviceIds
        };
    }
    if (customFilter.gatewayIds) {
        filter.include[1].where[Op.and].gatewayId = {
            [Op.in]: customFilter.gatewayIds
        };
    }
    if (customFilter.deviceStatuses) {
        filter.include[1].where[Op.and].status = {
            [Op.in]: customFilter.deviceStatuses
        };
    }
    if (customFilter.deviceTags) {
        filter.include[1].include = [
            {
                model: deviceTags,
                as: 'tags',
                where: {
                    value: {
                        [Op.in]: customFilter.deviceTags
                    }
                },
                attributes: []
            }
        ];
    }
};

var filterByComponentProperties = function (customFilter, filter) {
    if (customFilter.componentIds) {
        filter.where = {
            componentId: {
                [Op.in]: customFilter.componentIds
            }
        };
    }
    if (customFilter.componentTypes) {
        filter.where = {
            // id
            componentTypeId: {
                [Op.in]: customFilter.componentTypes
            }
        };
    }
    if (customFilter.componentNames) {
        filter.where = {
            name: {
                [Op.in]: customFilter.componentNames
            }
        };
    }
};
exports.getByCustomFilter = function(accountId, customFilter, resultCallback) {
    var filter = filterByAccountId(accountId);
    filterByComponentProperties(customFilter, filter);
    filterByDeviceProperties(customFilter, filter);

    deviceComponents.all(filter)
        .then(function (result) {
            interpreterHelper.mapAppResults(result, interpreter, resultCallback);
        })
        .catch (function(err) {
            resultCallback(err);
        });
};

exports.findComponentsAndTypesForDevice = function(accountId, deviceId, resultCallback) {
    var filter = {
        where: {
            accountId: accountId,
            id: deviceId
        }
    };
    devices.findOne(filter).then(device => {
        if (!device) {
            return resultCallback(errBuilder.Errors.Generic.NotAuthorized);
        }
        filter = {
            where: {
                deviceUID: device.uid
            },
            include: [{
                model: componentTypes, as: 'componentType'
            }],
            order: [
                ['created', 'ASC'],
                [{ model: componentTypes, as: 'componentType' }, 'created', 'ASC']
            ]
        };
        return deviceComponents.findAll(filter);
    }).then(function(result) {
        interpreterHelper.mapAppResults(result, interpreter, resultCallback);
    }).catch(function(err) {
        resultCallback(err);
    });
};

exports.updateLastObservationTS = function (componentId, date, resultCallback) {
    var filter = {
        where: {
            componentId: componentId
        }
    };
    return deviceComponents.findOne(filter).then(function (comp) {
        filter.where.last_observation_time = {
            [Op.lt]: new Date(date)
        };
        comp = interpreterHelper.mapAppResults(comp, interpreter);
        if (date > comp.last_observation_time) {
            comp.last_observation_time = date;
            deviceComponents.update(comp, filter)
                .then(function () {
                    resultCallback();
                })
                .catch(function (err) {
                    throw err;
                });
        } else {
            resultCallback();
        }
    });
};
