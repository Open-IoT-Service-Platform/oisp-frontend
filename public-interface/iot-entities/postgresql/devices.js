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
    helper = require('./helpers/queryHelper'),
    devices = require('./models').devices,
    deviceAttributes = require('./models').deviceAttributes,
    deviceComponents = require('./models').deviceComponents,
    componentTypes = require('./models').componentTypes,
    deviceTags = require('./models').deviceTags,
    Q = require('q'),
    interpreterHelper = require('../../lib/interpreter/helper'),
    interpreter = require('../../lib/interpreter/postgresInterpreter').devices(),
    deviceComponentsInterpreter = require('../../lib/interpreter/postgresInterpreter').deviceComponents(),
    componentTypeInerpreter = require('../../lib/interpreter/postgresInterpreter').componentTypes(),
    deviceModelHelper = require('./helpers/devicesModelHelper'),
    sequelize = require('./models').sequelize;

var ACTIVATE_DEVICE_QUERY = 'SELECT * FROM "dashboard"."activate_device"(:activationCode, :deviceId, :status) AS f(activated boolean, "accountId" uuid)';
var ADD_COMPONENTS_QUERY = 'SELECT * FROM dashboard.add_device_components(:components, :deviceId, :accountId)';
var DB_SCHEMA_NAME = helper.escapeValue('dashboard');
var deviceStatus = {created: "created", active: "active", inactive: "inactive"};
exports.status = deviceStatus;

var createDeviceAttributes = function (attributes, device, transaction) {
    if (attributes && device) {
        return deviceAttributes.bulkCreate(deviceModelHelper.formatDeviceAttributes(attributes, device.id), {transaction: transaction});
    } else {
        return Q.resolve();
    }
};

var createDeviceTags = function (tags, device, transaction) {
    if (tags && Array.isArray(tags) && device) {
        return deviceTags.bulkCreate(deviceModelHelper.formatDeviceTags(tags, device.id), {transaction: transaction});
    } else {
        return Q.resolve();
    }
};

var getDeviceRelations = function () {
    return [
        {model: deviceAttributes, as: 'attributes'},
        {model: deviceTags, as: 'tags'},
        {model: deviceComponents, as: 'deviceComponents', include: [componentTypes]}
    ];
};

exports.new = function (newDevice, transaction) {
    var deviceModel = interpreter.toDb(newDevice);

    return devices.create(deviceModel, {transaction: transaction})
        .then(function (createdDevice) {
            return createDeviceAttributes(deviceModel.attributes, createdDevice, transaction)
                .then(function () {
                    return createDeviceTags(deviceModel.tags, createdDevice, transaction)
                        .then(function () {
                            return interpreterHelper.mapAppResults(createdDevice, interpreter);
                        });
                });
        })
        .catch(function (err) {
            if (err.name === errBuilder.SqlErrors.AlreadyExists) {
                throw errBuilder.Errors.Device.AlreadyExists;
            }
            throw err;
        });
};

exports.all = function (accountId, resultCallback) {
    var filter = {
        where: {
            accountId: accountId
        },
        include: getDeviceRelations()
    };

    devices.findAll(filter)
        .then(function (devices) {
            interpreterHelper.mapAppResults(devices, interpreter, resultCallback);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.getDevices = function (accountId, queryParameters, resultCallback) {

    var queryParametersModel = interpreter.toDb(queryParameters);
    queryParametersModel = interpreter.toDbValues(queryParametersModel);
    helper.parseFilters(queryParametersModel, devices.attributes, function (err, filters) {
        if (err) {
            resultCallback(errBuilder.build(errBuilder.Errors.Data.InvalidData));
        } else {
            filters.include = getDeviceRelations();
            filters.where.accountId = accountId;

            devices.findAll(filters)
                .then(function (devices) {
                    interpreterHelper.mapAppResults(devices, interpreter, resultCallback);
                })
                .catch(function (err) {
                    resultCallback(err);
                });
        }
    });
};

exports.delete = function (deviceId, transaction) {
    var filter = {
        where: {id: deviceId},
        transaction: transaction
    };

    return devices.destroy(filter)
        .then(function (deletedCounter) {
            if (!deletedCounter || deletedCounter < 1) {
                throw errBuilder.Errors.Device.NotFound;
            }
        });
};

exports.findByIdAndAccount = function (deviceId, accountId, transaction) {
    var filter = {
        include: getDeviceRelations(),
        where: {
            id: deviceId
        },
        transaction: transaction
    };
    if (accountId) {
        filter.where.accountId = accountId;
    }
    return devices.find(filter)
        .then(function (device) {
            return interpreterHelper.mapAppResults(device, interpreter);
        });
};

var updateDeviceAttributes = function (attributes, device, transaction) {
    if (attributes) {
        return deviceAttributes.destroy({where: {deviceId: device.id}, transaction: transaction})
            .then(function () {
                return createDeviceAttributes(attributes, device, transaction);
            });
    } else {
        return Q.resolve();
    }
};

var updateDeviceTags = function (tags, device, transaction) {
    if (tags) {
        return deviceTags.destroy({where: {deviceId: device.id}, transaction: transaction})
            .then(function () {
                return createDeviceTags(tags, device, transaction);
            });
    } else {
        return Q.resolve();
    }
};

exports.updateByIdAndAccount = function (deviceId, accountId, updatedObject, transaction) {

    var filter = {
        where: {
            id: deviceId,
            accountId: accountId
        },
        returning: true,
        transaction: transaction
    };

    var deviceModel = interpreter.toDb(updatedObject);

    return devices.update(deviceModel, filter)
        .then(function (updatedDevice) {
            if (updatedDevice && updatedDevice.length > 1) {
                var device = updatedDevice[1][0];
                return updateDeviceTags(deviceModel.tags, device, transaction)
                    .then(function () {
                        return updateDeviceAttributes(deviceModel.attributes, device, transaction);
                    })
                    .then(function () {
                        return exports.findByIdAndAccount(device.id, device.accountId, transaction);
                    });
            } else {
                throw errBuilder.Errors.Device.NotFound;
            }
        })
        .then(function (device) {
            return device;
        })
        .catch(function (err) {
            throw err;
        });
};

/**
 * Activate device. In case of success returns - {activated: true, accountId:'deviceAccountId'}
 * In case when device not found returns - {activated: false, accountId:'deviceAccountId'}
 * In case when activation code is expired or invalid throws - Errors.Device.InvalidActivationCode
 */
exports.confirmActivation = function (deviceId, activationCode) {

    var replacements = {
        deviceId: deviceId,
        activationCode: activationCode,
        status: deviceStatus.active
    };

    return sequelize.query(ACTIVATE_DEVICE_QUERY, {replacements: replacements})
        .then(function (result) {
            if (result && result[0][0]) {
                return Q.resolve(result[0][0]);
            }
            throw errBuilder.Errors.Device.RegistrationError;
        })
        .catch(function(err) {
            if (err.message === errBuilder.SqlErrors.Device.AccountNotFound) {
                throw errBuilder.Errors.Account.NotFound;
            } else if (err.message === errBuilder.SqlErrors.Device.InvalidActivationCode) {
                throw errBuilder.Errors.Device.InvalidActivationCode;
            }

            throw err;
        });
};

exports.validateRefreshToken = function (deviceId, deviceRefreshToken) {
	return devices.findOne({where: {deviceId: deviceId}})
		.then(function(result) {
			if(!result)
				throw errBuilder.Errors.Device.NotFound;

			if(result.status === 'revoked')
				throw errBuilder.Errors.Device.RefreshTokenRevokedError;

			if(result.refreshToken !== deviceRefreshToken)
				throw errBuilder.Errors.Device.RefreshTokenWrongError;

			return {accountId: result.accountId}
		})
}

exports.addComponents = function (components, deviceId, accountId, transaction) {
    var componentsModel = deviceModelHelper.formatDeviceComponents(components);

    var replacements = {
        components: componentsModel,
        deviceId: deviceId,
        accountId: accountId
    };

    return sequelize.query(ADD_COMPONENTS_QUERY, {replacements: replacements,transaction: transaction})
        .then(function(result) {
            if (result && result.length > 0 && result[0][0]) {
                var deviceWithComponents = deviceModelHelper.formatAddComponentsResult(result[0], accountId);
                return interpreterHelper.mapAppResults({dataValues: deviceWithComponents}, interpreter);
            }
        })
        .catch(function (err) {
            if (err.name === errBuilder.SqlErrors.AlreadyExists) {
                throw errBuilder.Errors.Device.Component.AlreadyExists;
            }
            if (err.message === errBuilder.SqlErrors.Device.NotFound) {
                throw errBuilder.Errors.Device.NotFound;
            }
            if (err.message === errBuilder.SqlErrors.Device.ComponentTypeNotFound) {
                throw errBuilder.Errors.Device.Component.TypeNotFound;
            }
            throw err;
        });
};

exports.getTotals = function (accountId, resultCallback) {

    var filter = {
        where: {
            accountId: accountId
        }
    };

    devices.count(filter)
        .then(function (allDevicesCount) {
            filter.where.status = deviceStatus.active;
            return devices.count(filter)
                .then(function (activeDevicesCount) {
                    filter.where.status = deviceStatus.created;
                    return devices.count(filter)
                        .then(function (createdDevicesCount) {
                            return devices.count({where: {lastVisit: { $not: null}, status: deviceStatus.active}})
                                .then(function (currentDevicesCount) {
                                    resultCallback(null, deviceModelHelper.createTotalsResponse({activeDevices: activeDevicesCount,
                                        createdDevices: createdDevicesCount,
                                        allDevices: allDevicesCount,
                                        currentDevices: currentDevicesCount})
                                    );
                                });
                        });
                });
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

var criteriaQueryWrapper = function (criteria, queryParameters, resultCallback, dbFunction) {
    var filters;
    var criteriaModel = interpreter.toDb(criteria);
    var queryParametersModel = interpreter.toDb(queryParameters);
    helper.parseFiltersToSql(queryParametersModel, devices.attributes, function (err, resultFilters) {
        if (err) {
            resultCallback(errBuilder.build(errBuilder.Errors.Data.InvalidData));
        } else {
            filters = resultFilters;

            if (!criteriaModel.properties) {
                criteriaModel.properties = criteriaModel.attributes;
            }
            var propertiesQuery = helper.parsePropertiesQuery(criteriaModel.properties, DB_SCHEMA_NAME + '.' + helper.escapeValue(deviceAttributes.name));
            var tagQuery = helper.parseTagsQuery(criteriaModel.tags, DB_SCHEMA_NAME + '.' + helper.escapeValue(deviceTags.name));
            var componentsQuery = helper.parseComponentsQuery(criteriaModel.deviceComponents, DB_SCHEMA_NAME + '.' + helper.escapeValue(deviceComponents.name));

            delete criteriaModel.tags;
            delete criteriaModel.properties;
            delete criteriaModel.attributes;
            delete criteriaModel.deviceComponents;

            var parsedQuery = helper.parseQuery(criteriaModel);
            parsedQuery = helper.joinQueries([parsedQuery, propertiesQuery, tagQuery, componentsQuery]);

            if (parsedQuery) {
                dbFunction(parsedQuery, filters);
            } else {
                resultCallback(errBuilder.build(errBuilder.Errors.Data.InvalidData));
            }
        }
    });
};

exports.findByCriteria = function (criteria, queryParameters, resultCallback) {
    criteriaQueryWrapper(criteria, queryParameters, resultCallback,
        function (dbQuery, filters) {
            var query = 'SELECT d.id FROM "dashboard"."devices" d ' +
                'WHERE ' + dbQuery;
            if (filters) {
                query += (filters);
            }
            return sequelize.query(query, {type: sequelize.QueryTypes.SELECT})
                .then(function (result) {
                    if (result) {
                        var filters = {
                            where: {id: deviceModelHelper.getIdsFromQueryResult(result)},
                            include: getDeviceRelations()
                        };
                        return devices.findAll(filters)
                            .then(function (result) {
                                interpreterHelper.mapAppResults(result, interpreter, resultCallback);
                            });
                    } else {
                        resultCallback(null);
                    }
                })
                .catch(function (err) {
                    resultCallback(err);
                });
        });
};

exports.countByCriteria = function (criteria, queryParameters, resultCallback) {
    criteriaQueryWrapper(criteria, queryParameters, resultCallback,
        function (dbQuery) {
            var query = 'SELECT  count(distinct d.id) FROM "dashboard"."devices" d ' +
                'WHERE ' + dbQuery;
            sequelize.query(query, {type: sequelize.QueryTypes.SELECT})
                .then(function (result) {
                    var count = 0;
                    if (result && result[0]) {
                        count = parseInt(result[0].count);
                    }
                    resultCallback(null, count);
                })
                .catch(function (err) {
                    resultCallback(err);
                });

        });
};

var findByComponentId = function (componentId, resultCallback) {

    var filter = {
        include: [
            {model: devices, as: 'device'}
        ],
        where: {
            componentId: componentId
        }
    };

    deviceComponents.findOne(filter)
        .then(function (deviceComponent) {
            if (deviceComponent) {
                interpreterHelper.mapAppResults(deviceComponent, deviceComponentsInterpreter, resultCallback);
            } else {
                var emptyComponents = [];
                resultCallback(null, emptyComponents);
            }
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.findByComponentId = findByComponentId;

exports.findByAccountIdAndComponentId = function (accountId, componentIds, resultCallback) {
    var filter = {
        where: {
            accountId: accountId
        },
        include: [
            {
                model: deviceComponents, as: 'deviceComponents',
                where: { componentId: componentIds },
                include: [
                    {
                        model: componentTypes
                    }
                ]
            }
        ]
    };

    devices.findOne(filter)
        .then(function (deviceComponent) {
            if (deviceComponent) {
                deviceComponent.deviceComponents[0].componentType =
                    interpreterHelper.mapAppResults(deviceComponent.deviceComponents[0].componentType, componentTypeInerpreter);
                interpreterHelper.mapAppResults(deviceComponent, interpreter, resultCallback);
            } else {
                throw errBuilder.Errors.Device.Component.NotFound;
            }
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.deleteComponent = function (deviceId, componentId, transaction) {
    var filter = {
        where: {
            componentId: componentId,
            deviceId: deviceId
        },
        transaction: transaction
    };
    return deviceComponents.destroy(filter)
        .then(function (deletedCounter) {
            if (deletedCounter && deletedCounter < 1) {
                throw errBuilder.Errors.Device.Component.NotFound;
            }
        });
};

exports.belongsToAccount = function(deviceId, accountId) {
    var filter = {
        where: {
            accountId: accountId,
            id: deviceId
        }
    };
    return devices.findOne(filter)
        .then(function(result) {
            return new Promise(function(resolve, reject) {
                if (result !== undefined && result !== null) {
                    resolve();
                }
                else {
                    reject();
                }
            });
        });
};
