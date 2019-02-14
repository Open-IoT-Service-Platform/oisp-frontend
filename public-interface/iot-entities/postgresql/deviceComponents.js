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

var deviceComponents = require('./models').deviceComponents,
    componentTypes = require('./models').componentTypes,
    deviceTags = require('./models').deviceTags,
    devices = require('./models').devices,
    interpreterHelper = require('../../lib/interpreter/helper'),
    interpreter = require('../../lib/interpreter/postgresInterpreter').deviceComponents(),
    Q = require('q');

var filterByAccountId = function(accountId) {
    return {
        include: [
            {model: componentTypes, as: 'componentType'},
            {
                model: devices,
                where: {
                    $and: {
                        accountId: accountId
                    }
                },
                attributes: []
            }
        ]
    };
};

exports.all = function (accountId, resultCallback) {
    var filter = filterByAccountId(accountId);
    deviceComponents.all(filter)
        .then(function (result) {
            interpreterHelper.mapAppResults(result, interpreter, resultCallback);
        })
        .catch (function(err) {
            resultCallback(err);
        });
};

var filterByDeviceProperties = function (customFilter, filter) {
    if (customFilter.deviceNames) {
        filter.include[1].where.$and.name = {
            $in: customFilter.deviceNames
        };
    }
    if (customFilter.deviceIds) {
        filter.include[1].where.$and.id = {
            $in: customFilter.deviceIds
        };
    }
    if (customFilter.gatewayIds) {
        filter.include[1].where.$and.gatewayId = {
            $in: customFilter.gatewayIds
        };
    }
    if (customFilter.deviceStatuses) {
        filter.include[1].where.$and.status = {
            $in: customFilter.deviceStatuses
        };
    }
    if (customFilter.deviceTags) {
        filter.include[1].include = [
            {
                model: deviceTags,
                as: 'tags',
                where: {
                    value: {
                        $in: customFilter.deviceTags
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
                $in: customFilter.componentIds
            }
        };
    }
    if (customFilter.componentTypes) {
        filter.where = {
            // id
            componentTypeId: {
                $in: customFilter.componentTypes
            }
        };
    }
    if (customFilter.componentNames) {
        filter.where = {
            name: {
                $in: customFilter.componentNames
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
            console.log(err);
            resultCallback(err);
        });
};

exports.findComponentsAndTypesForDevice = function(deviceId, resultCallback) {
    var filter = {
        where: {
            deviceId: deviceId
        },
        include: [
            {
                model: componentTypes
            }]
    };
    deviceComponents.findAll(filter)
        .then(function(result) {
            interpreterHelper.mapAppResults(result, interpreter, resultCallback);
        })
        .catch(function(err) {
            console.log(err);
            resultCallback(err);
        });
};

exports.updateLastObservationTS = function (componentId, date, resultCallback) {
    var filter = {
        where: {
            componentId: componentId
        }
    };
    deviceComponents.find(filter).then(function (comp) {
        filter.where.last_observation_time = {
            $lt: new Date(date)
        };
        comp = interpreterHelper.mapAppResults(comp, interpreter);
        if (date > comp.last_observation_time) {
            comp.last_observation_time = date;
            deviceComponents.update(comp, filter)
                .then(function () {
                    return Q.resolve();
                })
                .catch(function (err) {
                    throw err;
                }).nodeify(resultCallback);
        } else {
            Q.resolve();
        }
    }).catch(function (err) {
        throw err;
    }).nodeify(resultCallback);
};
