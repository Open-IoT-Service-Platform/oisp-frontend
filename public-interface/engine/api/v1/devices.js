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
var postgresProvider = require('../../../iot-entities/postgresql'),
    Device = postgresProvider.devices,
    Tag = postgresProvider.deviceTags,
    Attributes = postgresProvider.deviceAttributes,
    Components = postgresProvider.deviceComponents,
    logger = require('../../../lib/logger/index').init(),
    errBuilder  = require("../../../lib/errorHandler/index").errBuilder,
    Q = require('q'),
    deviceManager = require('../helpers/deviceManager'),
    auth = require('../../../lib/security/index').authorization;

var cloneObject = function(object) {
    if (!object || typeof(object) !== 'object') {
        return object;
    }

    var clone = object.constructor();

    Object.keys(object).forEach(function(key) {
        clone[key] = cloneObject(object[key]);
    });

    return clone;
};

var generateToken = function(device, deviceAccount) {

    return Q.nfcall(auth.generateToken, device.deviceId, deviceAccount,  null, null)
        .catch(function(err) {
            logger.error("The Token could not be generated " + JSON.stringify(err));
            throw errBuilder.build(errBuilder.Errors.Device.ActivationError);
        });
};

var createDevice = function(newDevice) {
    return Device.new(newDevice)
        .then (function (addedDevice) {
            addedDevice.attributes = newDevice.attributes;
            addedDevice.tags = newDevice.tags;
            return addedDevice;
        });
};

exports.addDevice = function(newDevice, accountId, callback) {
    newDevice.status = Device.status.created;
    newDevice.accountId = accountId;

    return createDevice(newDevice)
        .then (function (addedDevice) {
            callback(null, addedDevice);
        })
        .catch (function(err) {
            if (err && err.code) {
                callback(errBuilder.build(err));
            } else {
                callback(errBuilder.build(errBuilder.Errors.Device.SavingError));
            }
        });
};

exports.getDevices = function (accountId, queryParameters, resultCallback) {
    Device.getDevices(accountId, queryParameters, resultCallback);
};

exports.updateDevice = function (deviceId, device, accountId) {
    delete device.deviceId;
    delete device.status;

    return postgresProvider.startTransaction()
        .then(function(transaction){
            return Device.updateByIdAndAccount(deviceId, accountId, device, transaction)
                .then(function() {
                    return Device.findByIdAndAccount(deviceId, accountId, transaction)
                        .then(function(updatedDevice) {
                            if (updatedDevice) {
                                return updatedDevice;
                            } else {
                                throw errBuilder.Errors.Device.NotFound;
                            }
                        });
                })
                .then(function(updatedDevice) {
                    return postgresProvider.commit(transaction).
                        then(function() {
                            return updatedDevice;
                        });
                })
                .catch(function(err) {
                    return postgresProvider.rollback(transaction)
                        .done(function() {
                            var errMsg = errBuilder.Errors.Device.SavingError;
                            if (err && err.code) {
                                errMsg = err;
                            }
                            throw errBuilder.build(errMsg);
                        });
                });
        });
};

var deleteDeviceInternal = function(deviceId, transaction) {
    return Device.delete(deviceId, transaction)
        .catch(function(err) {
            logger.error("Devices - could not delete device from db: " + JSON.stringify(err));
            throw errBuilder.Errors.Device.DeletionError;
        });
};

exports.deleteDevice = function (deviceId, accountId, resultCallback) {

    return Device.findByIdAndAccount(deviceId, accountId)
        .then(function(retrievedDevice){
            if (!retrievedDevice) {
                throw errBuilder.Errors.Device.NotFound;
            }

            return deleteDeviceInternal(deviceId);
        })
        .then(function() {
            resultCallback(null);
        })
        .catch(function(err) {
            var errMsg = errBuilder.Errors.Device.DeletionError;
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            resultCallback(errMsg);
        });

};

exports.getDevice = function (deviceId, accountId, resultCallback) {
    return Device.findByIdAndAccount(deviceId, accountId)
        .then(function(foundDevice) {
            if(!foundDevice) {
                throw errBuilder.Errors.Device.NotFound;
            }
            resultCallback(null, foundDevice);
        })
        .catch(function() {
            resultCallback(errBuilder.build(errBuilder.Errors.Device.NotFound));
        });
};

var createAndRegisterDevice = function (deviceToRegister, accountId) {

    var deviceId = deviceToRegister.deviceId;
    var newName = deviceToRegister.name || deviceId + "-NAME";
    var gatewayId = deviceToRegister.gatewayId || deviceId;

    var device = {
        domainId: accountId,
        name: newName,
        gatewayId: gatewayId,
        deviceId: deviceId,
        loc: deviceToRegister.loc,
        description: deviceToRegister.description,
        tags: deviceToRegister.tags,
        attributes: deviceToRegister.attributes,
        status: Device.status.active
    };

    if (device.attributes) {
        device.attributes['active'] = true;
    } else {
        device.attributes = {active: true};
    }

    return createDevice(device);
};


exports.registerDevice = function (deviceToRegister, activationCode, resultCallback) {
    
    return Device.confirmActivation(deviceToRegister.deviceId, activationCode)
        .then (function(activationResult) {
            if (activationResult.activated === false) {
                return createAndRegisterDevice(deviceToRegister, activationResult.accountId)
                    .then(function(){
                        return activationResult;
                    });
            } else {
                return activationResult;
            }
        })
        .then(function(activationResult) {
            var deviceAccount = [{
                id: activationResult.accountId,
                role: 'device'
            }];
            return generateToken(deviceToRegister, deviceAccount)
                .then(function(token) {
                    if (!token) {
                        throw errBuilder.Errors.Device.ActivationError;
                    }
                    resultCallback(null, {deviceToken: token, domainId: activationResult.accountId});
                });
        })
        .catch(function(err) {
            logger.warn('registerDevice - error during registration, err: ' + JSON.stringify(err));
            var errMsg = errBuilder.Errors.Device.RegistrationError;
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            resultCallback(errMsg);
        });
};

function runFunctionIfValidCriteria(criteria, queryParameters, resultCallback, deviceFunction) {
    if (criteria) {
        deviceFunction(criteria, queryParameters, resultCallback);
    } else {
        resultCallback(errBuilder.build(errBuilder.Errors.Data.InvalidData));
    }
}

exports.findByCriteria = function(criteria, queryParameters, resultCallback) {
    runFunctionIfValidCriteria(criteria, queryParameters, resultCallback, Device.findByCriteria);
};

exports.countByCriteria = function(criteria, queryParameters, resultCallback) {
    runFunctionIfValidCriteria(criteria, queryParameters, resultCallback, Device.countByCriteria);
};

exports.getTags = function(accountId, resultCallback) {
    Tag.all(accountId, function(err, tags) {
        if(!err){
            resultCallback(null, tags);
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.Device.NotFound));
        }
    });
};

exports.getAttributes = function(accountId, resultCallback) {
    Attributes.all(accountId, function(err, attributes) {
        if(!err){
            resultCallback(null, attributes);
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.Device.NotFound));
        }
    });
};

exports.getComponents = function(accountId, resultCallback) {
    Components.all(accountId, function(err, components) {
        if(!err){
            resultCallback(null, components);
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.Device.Component.NotFound));
        }
    });
};

exports.getComponentsByCustomFilter = function(accountId, customFilter, resultCallback) {
    Components.getByCustomFilter(accountId, customFilter, function(err, components) {
        if(!err){
            resultCallback(null, components);
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.Device.Component.NotFound));
        }
    });
};

exports.getDeviceTotals = function(accountId, resultCallback) {
    Device.getTotals(accountId, function(err, result) {
        if (!err) {
            resultCallback(null, {device:  result});
        } else {
            resultCallback(null, err);
        }
    });
};

exports.updateLastVisit = function(deviceId) {
    return Device.updateLastVisit(deviceId)
        .catch(function() {
            throw errBuilder.Errors.Device.SavingError;
        });
};

exports.deleteComponent = function (deviceId, componentId, accountId) {
    return postgresProvider.startTransaction()
        .then(function(transaction) {
            return  Device.findByIdAndAccount(deviceId, accountId, transaction)
                .then(function(retrievedDevice){
                    if (!retrievedDevice) {
                        throw errBuilder.Errors.Device.NotFound;
                    }

                    if (!retrievedDevice.components || retrievedDevice.components.length === 0) {
                        throw errBuilder.Errors.Device.Component.NotFound;
                    }

                    var componentExists = false;
                    var newComponents = retrievedDevice.components.filter(function(c) {
                        if (c.cid === componentId) {
                            componentExists = true;
                        }
                        return c.cid !== componentId;
                    });

                    if(!componentExists) {
                        throw errBuilder.Errors.Device.Component.NotFound;
                    }

                    // we need to save new components list
                    retrievedDevice.components = newComponents;

                    return Device.deleteComponent(deviceId, componentId, transaction)
                        .then(function() {
                            return postgresProvider.commit(transaction);
                        });
                })
                .catch (function(err) {
                    return postgresProvider.rollback(transaction)
                        .done(function() {
                            var errMsg = errBuilder.Errors.Device.Component.DeleteError;
                            if(err && err.code) {
                                errMsg = errBuilder.build(err);
                            }
                            throw errMsg;
                        });
                });
        });
};

exports.addComponents = function(deviceId, components, accountId) {
    var arrayReceived = Array.isArray(components);
    if(!arrayReceived) {
        components = [ components ];
    }
    var cids = {}, types = {}, uniqueIds = true, duplicates = {};


    components.forEach(function(item) {
        if(!cids[item.cid]) {
            cids[item.cid] = true;
            item.type = item.type.toLowerCase();
            types[item.type] = true;
            item.deviceId = deviceId;
            delete item.attributes;
        } else {
            uniqueIds = false;
            duplicates[item.cid] = true;
        }
    });
    if(!uniqueIds) {
        var error = cloneObject(errBuilder.Errors.Device.Component.IdsNotUnique);
        error.message += Object.keys(duplicates).join(', ');
        return Q.reject(errBuilder.build(error));
    }

    types = Object.keys(types);

    return postgresProvider.startTransaction()
            .then(function(transaction) {
                return Device.addComponents(components, deviceId, accountId, transaction)
                    .then (function (updatedDevice) {
                        if (!deviceManager.isDeviceActive(updatedDevice)) {
                            throw errBuilder.Errors.Device.Component.DeviceNotActive;
                        }
                    })
                    .then(function() {
                        return postgresProvider.commit(transaction)
                            .then(function() {
                                var response = components;
                                if (!arrayReceived) {
                                    response = components[0];
                                }
                                return Q.resolve(response);
                            });
                    })
                    .catch(function(err) {
                        logger.warn("devices.addComponents - unable to add component for device: " + deviceId + "error: " + JSON.stringify(err));
                        return postgresProvider.rollback(transaction)
                            .then(function(){
                                var errMsg = errBuilder.Errors.Device.Component.AddingError;
                                if (err && err.code) {
                                    errMsg = errBuilder.build(err);
                                }
                                throw errMsg;
                            });
                    });
        });
};

exports.findByAccountIdAndComponentId = function(accountId, components, resultCallback) {
    Device.findByAccountIdAndComponentId(accountId, components, resultCallback);
};
