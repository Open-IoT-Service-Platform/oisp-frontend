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
    accounts = require('./models').accounts,
    devices = require('./models').devices,
    deviceAttributes = require('./models').deviceAttributes,
    deviceComponents = require('./models').deviceComponents,
    componentTypes = require('./models').componentTypes,
    deviceTags = require('./models').deviceTags,
    Q = require('q'),
    interpreterHelper = require('../../lib/interpreter/helper'),
    interpreter = require('../../lib/interpreter/postgresInterpreter').devices(),
    deviceComponentsInterpreter = require('../../lib/interpreter/postgresInterpreter').deviceComponents(),
    modelsHelper = require('./helpers/modelsHelper'),
    componentTypeInerpreter = require('../../lib/interpreter/postgresInterpreter').componentTypes(),
    deviceModelHelper = require('./helpers/devicesModelHelper'),
    sequelize = require('./models').sequelize;

const Op = sequelize.Op,
    EXISTS = "exists",
    IN = "in",
    EQ = "eq",
    NEQ = "neq",
    LIKE = "like",
    ALL = 'all';

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
    return [{ model: deviceAttributes, as: 'attributes' },
        { model: deviceTags, as: 'tags' },
        { model: deviceComponents, as: 'deviceComponents',
            include: [{ model: componentTypes, as: 'componentType' }]}
    ];
};

var getIntersection = function (arr1, arr2) {
    return arr2.filter(entry => arr2.indexOf(entry) !== -1);
};

var getDifference = function (arr1, arr2) {
    return arr1.filter(entry => arr2.indexOf(entry) === -1);
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
    var filters = modelsHelper.setQueryParameters(queryParametersModel, devices.attributes, {});
    filters.include = getDeviceRelations();
    filters.where.accountId = accountId;

    devices.findAll(filters)
        .then(function (devices) {
            interpreterHelper.mapAppResults(devices, interpreter, resultCallback);
        })
        .catch(function (err) {
            resultCallback(err);
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
    return devices.findOne(filter)
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
    var filter = {
        where: {
            activation_code: activationCode
        }
    };
    var accountId;
    return accounts.findOne({where: {activation_code: activationCode}})
        .then(account => {
            if (account.id === null) {
                throw errBuilder.Errors.Account.NotFound;
            } else if (account.activation_code_expire_date < Date.now()) {
                throw errBuilder.Errors.Device.InvalidActivationCode;
            }
            accountId = account.id;
            filter = {
                returning: true,
                where: {
                    id: deviceId,
                    accountId: accountId
                }
            };
            return devices.update({ status: deviceStatus.active }, filter);
        })
        .then(([updatedRows, [updatedDevice]]) => {
            if (updatedRows !== 1) {
                return Q.resolve({ activated: false, accountId: accountId });
            }
            updatedDevice.activated = true;
            return Q.resolve(updatedDevice);
        });
};

exports.addComponents = function(components, deviceId, accountId, transaction) {
    var types = [];
    components.forEach(component => {
        types.push({
            accountId: null,
            default: true,
            componentTypeId: component.type
        });
        types.push({
            accountId: accountId,
            componentTypeId: component.type
        });
    });

    var filters = {
        where: {
            [Op.or]: types
        },
        attributes: ['id', 'componentTypeId'],
        transaction: transaction
    };

    return componentTypes.findAll(filters)
        .then(types => {
            var typeToId = {};
            types.forEach(type => {
                typeToId[type.componentTypeId] = type.id;
            });
            var typeNotFound = false;
            var records = components.map(component => {
                if (!typeToId[component.type]) {
                    typeNotFound = true;
                } else {
                    return {
                        componentId: component.cid,
                        name: component.name,
                        componentTypeId: typeToId[component.type],
                        deviceId: deviceId,
                    };
                }
            });
            if (typeNotFound) {
                throw errBuilder.Errors.Device.Component.TypeNotFound;
            }
            return deviceComponents.bulkCreate(records, { validate: true, transaction: transaction });
        })
        .then(() => {
            filters = {
                where: {
                    id: deviceId,
                    accountId: accountId
                },
                include: getDeviceRelations(),
                transaction: transaction
            };
            return devices.findAll(filters);
        })
        .then(result => {
            if (result && result.length > 0 && result[0]) {
                var deviceWithComponents = deviceModelHelper.formatAddComponentsResult(result[0], accountId);
                return interpreterHelper.mapAppResults({dataValues: deviceWithComponents}, interpreter);
            }
        })
        .catch(err => {
            if (err.name === errBuilder.SqlErrors.AlreadyExists) {
                throw errBuilder.Errors.Device.Component.AlreadyExists;
            } else if (err.name === errBuilder.SqlErrors.ForeignKeyNotFound) {
                throw errBuilder.Errors.Device.NotFound;
            } else {
                throw err;
            }
        });
};

exports.getTotals = function (accountId, resultCallback) {
    var filter = {
        where: {
            accountId: accountId
        }
    };
    var result = {};
    devices.count(filter)
        .then(function (allDevicesCount) {
            result.allDevices = allDevicesCount;
            filter.where.status = deviceStatus.active;
            return devices.count(filter);
        })
        .then(activeDevicesCount => {
            result.activeDevices = activeDevicesCount;
            result.currentDevices = activeDevicesCount;
            filter.where.status = deviceStatus.created;
            return devices.count(filter);
        })
        .then(function (createdDevicesCount) {
            result.createdDevices = createdDevicesCount;
            resultCallback(null, deviceModelHelper.createTotalsResponse(result));
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

var getSingleCondition = function(operator, value) {
    switch (operator) {
    case IN:
        if (typeof value === 'string') {
            value = value.split(",");
        }
        if (value && Array.isArray(value) && value.length > 0) {
            return { [Op.in]: value };
        }
        break;
    case LIKE:
        if (value) {
            return { [Op.like]: '%' + value + '%' };
        }
        break;
    case EQ:
        if (value) {
            return { [Op.eq]: value };
        }
        break;
    case NEQ:
        if (value) {
            return { [Op.ne]: value };
        }
        break;
    default:
        return null;
    }
};

var getTagsFilterGroupedByDevice = function(parameters) {
    if (!parameters || !parameters.operator || !parameters.value ||
            parameters.value.length === 0) {
        return null;
    }
    var tagsFilter = {
        group: 'deviceId',
        attributes: ['deviceId']
    };
    switch (parameters.operator) {
    case EXISTS:
        break;
    case LIKE:
        if (typeof parameters.value === 'string') {
            parameters.value = parameters.value.split(",");
        }
        if (Array.isArray(parameters.value)) {
            tagsFilter.where = {
                value: {
                    [Op.like]: {
                        [Op.any]: parameters.value.map(val => '%' + val + '%')
                    }
                }
            };
        } else {
            tagsFilter.required = false;
        }
        break;
    case ALL:
        if (typeof parameters.value === 'string') {
            parameters.value = parameters.value.split(",");
        }
        if (Array.isArray(parameters.value) && parameters.value.length > 0) {
            tagsFilter.having = sequelize.where(sequelize.fn('count',
                sequelize.col('deviceId')), Op.eq, parameters.value.length);
            tagsFilter.where = {
                value: {
                    [Op.in]: parameters.value
                }
            };
        } else {
            tagsFilter.required = false;
        }
        break;
    case EQ:
        tagsFilter.where = {
            value: {
                [Op.eq]: parameters.value
            }
        };
        break;
    case NEQ:
        tagsFilter.where = {
            value: {
                [Op.ne]: parameters.value
            }
        };
        break;
    case IN:
        if (typeof parameters.value === 'string') {
            parameters.value = parameters.value.split(",");
        }
        if (Array.isArray(parameters.value)) {
            tagsFilter.having = sequelize.where(sequelize.fn('count',
                sequelize.col('deviceId')), Op.eq, 0);
            tagsFilter.where = {
                value: {
                    [Op.notIn]: parameters.value
                }
            };
        } else {
            tagsFilter.required = false;
        }
        break;
    default:
        break;
    }
    return tagsFilter;
};

var getComponentsFilterGroupedByDeviceId = function(parameters) {
    if (!parameters || Object.keys(parameters).length === 0) {
        return null;
    }
    var cmpsFilter = {
        group: 'deviceId',
        attributes: ['deviceId']
    };
    if (parameters.operator === EXISTS) {
        return cmpsFilter;
    }
    if (parameters.value !== Object(parameters.value)) {
        return null;
    }
    cmpsFilter.where = {};
    Object.keys(parameters.value).forEach(property => {
        var condition = getSingleCondition(parameters.operator, parameters.value[property]);
        if (condition) {
            cmpsFilter.where[property] = condition;
        }
    });
    return cmpsFilter;
};

var getAttributesFilterGroupedByDeviceId = function(parameters) {
    if (!parameters || Object.keys(parameters).length === 0) {
        return null;
    }
    if ((parameters.operator && !parameters.value) ||
            (!parameters.operator && parameters.value)) {
        return null;
    }
    var attrsFilter = {
        group: 'deviceId',
        attributes: ['deviceId']
    };
    var filters = [];
    if (parameters.operator === EXISTS) {
        return attrsFilter;
    } else if (parameters.operator === IN) {
        if (typeof parameters.value === 'string') {
            parameters.value = parameters.value.split(",");
        }
        if (!Array.isArray(parameters.value)) {
            return null;
        }
        parameters.value.forEach(property => {
            if (property !== Object(property)) {
                return;
            }
            for (var key in property) {
                if (property.hasOwnProperty(key)) {
                    filters.push({
                        [Op.and]: [{ key: key }, { value: property[key] }]
                    });
                }
            }
        });
        attrsFilter.where = {
            [Op.or]: filters
        };
        return attrsFilter;
    }
    var defaultOperator = EQ;
    if (parameters.value && parameters.value === Object(parameters.value)) {
        defaultOperator = parameters.operator;
        parameters = parameters.value;
    }
    Object.keys(parameters).forEach(key => {
        var operator = parameters[key].operator ? parameters[key].operator : defaultOperator;
        var k = parameters[key].name ? parameters[key].name : key;
        var condition = getSingleCondition(operator, parameters[key].value);
        if (condition) {
            filters.push({
                [Op.and]: [{ key: k }, { value: condition }]
            });
        }
    });
    attrsFilter.where = {
        [Op.or]: filters
    };
    attrsFilter.having = sequelize.where(sequelize.fn('count',
        sequelize.col('deviceId')), Op.eq, Object.keys(parameters).length);
    return attrsFilter;
};

var criteriaQuery = function (criteria, queryParameters) {
    var criteriaModel = interpreter.toDb(criteria);
    var queryParametersModel = interpreter.toDb(queryParameters);
    if (!criteriaModel.properties) {
        criteriaModel.properties = criteriaModel.attributes;
    }
    var filter = {
        where: {},
        include: [],
        group: ['devices.id']
    };
    filter = modelsHelper.setQueryParameters(queryParametersModel, devices.attributes, filter);

    var tagsCriteria = criteriaModel.tags;
    var componentsCriteria = criteriaModel.components;
    var propertiesCriteria = criteriaModel.properties;
    var devicesCriteria = criteriaModel;
    delete criteriaModel.tags;
    delete criteriaModel.properties;
    delete criteriaModel.attributes;
    delete criteriaModel.deviceComponents;

    var cmpsFilter = getComponentsFilterGroupedByDeviceId(componentsCriteria);
    var attrsFilter = getAttributesFilterGroupedByDeviceId(propertiesCriteria);
    var tagsFilter = getTagsFilterGroupedByDevice(tagsCriteria);

    Object.keys(devicesCriteria).forEach(criteria => {
        var condition = getSingleCondition(criteriaModel[criteria].operator,
            criteriaModel[criteria].value);
        if (condition) {
            filter.where[criteria] = condition;
        }
    });
    var subCondition = {
        deviceId: null
    };

    return devices.findAll(filter)
        .then(result => {
            var devIds = result.map(entry => entry.id);
            if (cmpsFilter) {
                subCondition.deviceId = { [Op.in]: devIds };
                cmpsFilter.where = sequelize.and(cmpsFilter.where, subCondition);
                return deviceComponents.findAll(cmpsFilter)
                    .then(result => {
                        result = result.map(entry => entry.deviceId);
                        if (componentsCriteria.operator === EXISTS &&
                                componentsCriteria.value === false) {
                            return getDifference(devIds, result);
                        }
                        return getIntersection(devIds, result);
                    });
            }
            return Q.resolve(devIds);
        })
        .then(devIds => {
            if (tagsFilter) {
                subCondition.deviceId = { [Op.in]: devIds };
                tagsFilter.where = sequelize.and(tagsFilter.where, subCondition);
                return deviceTags.findAll(tagsFilter)
                    .then(result => {
                        result = result.map(entry => entry.deviceId);
                        if (tagsCriteria.operator === EXISTS &&
                                tagsCriteria.value === false) {
                            return getDifference(devIds, result);
                        }
                        return getIntersection(devIds, result);
                    });
            }
            return Q.resolve(devIds);
        })
        .then(devIds => {
            if (attrsFilter) {
                subCondition.deviceId = { [Op.in]: devIds };
                attrsFilter.where = sequelize.and(attrsFilter.where, subCondition);
                return deviceAttributes.findAll(attrsFilter)
                    .then(result => {
                        result = result.map(entry => entry.deviceId);
                        if (propertiesCriteria.operator === EXISTS &&
                                propertiesCriteria.value === false) {
                            return getDifference(devIds, result);
                        }
                        return getIntersection(devIds, result);
                    });
            }
            return Q.resolve(devIds);
        });
};

exports.findByCriteria = function (criteria, queryParameters, resultCallback) {
    criteriaQuery(criteria, queryParameters)
        .then(devIds => {
            if (devIds) {
                var filter = {
                    where: {
                        id: {
                            [Op.in]: devIds
                        }
                    },
                    include: getDeviceRelations()
                };
                return devices.findAll(filter);
            }
            return Q.resolve(null);
        })
        .then(result => {
            if (result) {
                interpreterHelper.mapAppResults(result, interpreter, resultCallback);
            } else {
                resultCallback(null);
            }
        })
        .catch(err => {
            resultCallback(err);
        });
};

exports.countByCriteria = function (criteria, queryParameters, resultCallback) {
    criteriaQuery(criteria, queryParameters)
        .then(devIds => {
            var filter = {
                where: {
                    id: {
                        [Op.in]: devIds
                    }
                },
            };
            return devices.count(filter);
        })
        .then(count => {
            resultCallback(null, count);
        })
        .catch(err => {
            resultCallback(err);
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
                        model: componentTypes, as: 'componentType'
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
