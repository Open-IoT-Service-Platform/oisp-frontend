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

var DevicesAPI = require('./devices'),
    AccountAPI = require('./accounts'),
    UsersAPI = require('./users'),
    config = require('../../../config'),
    errBuilder = require("../../../lib/errorHandler").errBuilder,
    DataProxy = require('../../../lib/advancedanalytics-proxy').DataProxy,
    proxy = new DataProxy(config.drsProxy),
    logger = require('../../../lib/logger').init(),
    secConfig = require('../../../lib/security/config'),
    mailer = require('../../../lib/mailer'),
    ValuesValidator = require('../helpers/componentValuesValidator'),
    ValuesTransformer = require('../helpers/componentValuesTransformer'),
    ReturnValuesTransformer = require('../helpers/componentReturnValuesTransformer'),
    entityProvider = require('../../../iot-entities/postgresql/index'),
    Component = entityProvider.deviceComponents,
    Devices = entityProvider.devices;

exports.collectData = function(options, resultCallback) {
    var deviceId = options.deviceId,
        data = options.data,
        accountId = data.accountId,
        identity = options.identity,
        dataLength = options.data.data.length;

    // Needed checks:
    // For user and device:
    // 1a) Device does not have components => Component.NotFound
    // 1b) dataType does not fit to value => InvalidData
    // 1c) Component not fitting to the device => Component.NotFound
    // 1d) Only Some of the Components fitting to device => PartiallyDataProcessed
    // For device only:
    // 2a) Device not sending with own ID => Not.Authorized
    // For user only:
    // 3a) Device does not belong to one of the accounts of the user => NotAuthorized
    //
    Component.findComponentsAndTypesForDevice(deviceId, function(errGetComponents, filteredComponents) {
        if (!errGetComponents && filteredComponents && filteredComponents.length > 0) { //Case 1a
            // If token is not a device token, check account/device relationship
            // For a device token, this is part of the token info
            var preCheck = function(type) {
                if (type === secConfig.tokenTypes.user) { //Case 3a
                    return Devices.belongsToAccount(deviceId, accountId)
                        .catch(() => Promise.reject(errBuilder.build(
                            errBuilder.Errors.Generic.NotAuthorized)));
                } else if (identity !== deviceId) { //Case 2a
                    return Promise.reject()
                        .catch(() => Promise.reject(errBuilder.build(
                            errBuilder.Errors.Generic.NotAuthorized)));
                }
                else {
                    return Promise.resolve("test");
                }
            };

            preCheck(options.type)
                /*jshint -W098 */
                .then((test) => {
                /*jshint +W098 */
                    var err;
                    var foundComponents = [];
                    var filteredData = data.data.filter(item => {
                        var cmp = filteredComponents.find(cmp => cmp.cid === item.componentId);
                        if (undefined === cmp) {
                            return false;
                        }
                        if (new ValuesValidator(cmp.componentType.dataType, item.value).validate() === true) {
                            foundComponents.push(cmp.cid);
                            item.dataType = cmp.componentType.dataType;
                            item.value = new ValuesTransformer(cmp.componentType.dataType, item.value).transform();
                            return true;
                        } else {
                            err = errBuilder.build(
                                errBuilder.Errors.Data.InvalidData,
                                "Invalid data value(" + item.value + ") for the component(" +
                                    cmp.cid + ") with type: " + cmp.componentType.dataType);
                            return false;
                        }
                    });
                    if (err) { //Case 1b
                        resultCallback(err);
                    } else if (foundComponents.length > 0) { //Case 1c
                        // this message get to this point by REST API, we need to forward it to MQTT channel for future consumption
                        data.domainId = accountId;
                        data.gatewayId = identity;
                        data.deviceId = deviceId;
                        data.systemOn = Date.now();
                        data.data = filteredData;
                        data.hasBinary = options.hasBinary;
                        var submitData = proxy.submitDataKafka;
                        if (config.drsProxy.ingestion === 'REST') {
                            submitData = proxy.submitDataREST;
                        }

                        logger.debug("Data to Send: " + JSON.stringify(data));
                        submitData(data, function(err) {
                            if (!err) {
                                if (foundComponents.length !== dataLength) { //Case 1d
                                    err = errBuilder.build(
                                        errBuilder.Errors.Data.PartialDataProcessed,
                                        "Only the following components could be sent: " + JSON.stringify(foundComponents));
                                }
                            }
                            resultCallback(err);
                        });

                    } else { //1c
                        // None of the components is registered for the device
                        resultCallback(errBuilder.build(errBuilder.Errors.Device.Component.NotFound));
                    }
                })
                .catch((err) => resultCallback(err));
        } else { //1a
            resultCallback(errBuilder.build(errBuilder.Errors.Device.Component.NotFound));
        }
    });
};

function findDevices(accountId, targetFilter, resultCallback) {
    var searchCriteria = [];

    if (targetFilter.deviceList) {
        searchCriteria.deviceId = {operator:"in", value:targetFilter.deviceList};
    } else {
        if (targetFilter.criteria) {
            searchCriteria = targetFilter.criteria;
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.Data.InvalidData));
            return;
        }
    }
    searchCriteria.domainId = {operator:"eq", value:accountId};

    DevicesAPI.findByCriteria(searchCriteria, {}, function(err, devices) {
        resultCallback(err, devices);
    });
}

function DataInquiryResponse(data, deviceLookUp, queryMeasureLocation) {
    var _self = this;
    logger.debug("Building Response with Data: " + JSON.stringify(data));
    logger.debug("Device Lookup: " + JSON.stringify(deviceLookUp));
    _self.from = data.startDate;
    _self.to = data.endDate;
    _self.maxItems = data.maxPoints;
    _self.series = [];
    _self.pointsLimit = '1000';
    data.components.forEach(function(component) {
        var serie = {};
        if(!deviceLookUp[component.componentId]) {
            logger.warn("DataInquiryResponse. Invalid response - returned component '" + component.componentId  + "' was not present in the request");
            return;
        }
        serie.deviceId = deviceLookUp[component.componentId].id;
        serie.deviceName = deviceLookUp[component.componentId].deviceName;
        serie.componentId = component.componentId;
        serie.componentName = deviceLookUp[component.componentId].name;
        serie.componentType = deviceLookUp[component.componentId].type;
        serie.attributes = data.attributes || {};
        serie.points = [];
        component.samples.forEach(function(point) {
	    var returnValue = new ReturnValuesTransformer(serie.componentType.dataType, point[1]).transform();
            if (queryMeasureLocation) {
                serie.points.push({ts:point[0], value:returnValue, lat:point[2], lon:point[3], alt:point[4]});
            } else {
                serie.points.push({ts:point[0], value:returnValue});
            }
        });
        _self.series.push(serie);
    });
}

exports.search = function(accountId, searchRequest, resultCallback) {

    findDevices(accountId, searchRequest.targetFilter, function(err, resolvedDevices) {
        if (!err) {
            AccountAPI.getAccount(accountId, function(e, foundAccount){
                if (!e && foundAccount) {
                    var componentsWithDataType = {};
                    var deviceLookUp = {};
                    logger.debug("resolvedDevices: " + JSON.stringify(resolvedDevices));
                    var metricsArray = searchRequest.metrics.map(function(m) {
                        return m.id;
                    });
                    logger.debug("metrics Array: " + metricsArray);
                    resolvedDevices.forEach(function(target) {
                        if (target.components) {
                            target.components.forEach(function(component) {
                                if (metricsArray.indexOf(component.cid) > -1) {
                                    componentsWithDataType[component.cid] = {dataType: component.componentType.dataType};
                                    deviceLookUp[component.cid] = {id:target.deviceId, name: component.name, type: component.type, deviceName:target.name};
                                }
                            });
                        }
                    });

                    searchRequest.componentList = componentsWithDataType;
                    searchRequest.domainId = foundAccount.public_id;
                    searchRequest.from = searchRequest.from || 0;
                    delete searchRequest.targetFilter;
                    logger.debug("search Request: " + JSON.stringify(searchRequest));
                    if (Object.keys(componentsWithDataType).length > 0) {
                        proxy.dataInquiry(searchRequest, function(err, result, isBinary) {
                            if (!err) {
                                var response = new DataInquiryResponse(result, deviceLookUp, searchRequest.queryMeasureLocation);
                                resultCallback(null, response, isBinary);
                            } else if (result) {
                                resultCallback(err, result);
                            } else {
                                resultCallback(err, null);
                            }
                        });
                    } else {
                        resultCallback(null, {});
                    }
                } else {
                    resultCallback(err);
                }
            });
        } else {
            resultCallback(err);
        }
    });
};

var checkIfFiltersFulfilled = function (componentIds, componentTypes, componentNames, component) {
    if (componentIds && componentIds.length > 0 && componentIds.indexOf(component.cid) < 0) {
        return false;
    } else if (componentTypes && componentTypes.length > 0 && componentTypes.indexOf(component.componentType.id) < 0) {
        return false;
    } else if (componentNames && componentNames.length > 0 && componentNames.indexOf(component.name) < 0) {
        return false;
    }
    return true;
};

exports.searchAdvanced = function (accountId, searchRequest, resultCallback) {
    var tags = [], deviceNames = [],componentTypes = [], componentNames = [];
    if (searchRequest.devCompAttributeFilter) {
        tags = searchRequest.devCompAttributeFilter.Tags ? searchRequest.devCompAttributeFilter.Tags : [];
        deviceNames = searchRequest.devCompAttributeFilter.deviceName ? searchRequest.devCompAttributeFilter.deviceName : [];
        componentTypes = searchRequest.devCompAttributeFilter.componentType ? searchRequest.devCompAttributeFilter.componentType : [];
        componentNames = searchRequest.devCompAttributeFilter.componentName ? searchRequest.devCompAttributeFilter.componentName : [];
    }

    var filters = {
        criteria: {
            deviceId: {operator: "in", value: searchRequest.deviceIds ? searchRequest.deviceIds : []},
            gatewayId: {operator: "in", value: searchRequest.gatewayIds ? searchRequest.gatewayIds : []},
            name: {operator: "in", value: deviceNames},
            // we use 'all' operator according to backward compatibility
            tags: {operator: "all", value: tags},
            status: {operator: "eq", value: "active"}
        }
    };

    findDevices(accountId, filters, function (errFindDevices, resolvedDevices) {
        var deviceData = [];
        if (!errFindDevices) {
            resolvedDevices.forEach(function (target) {
                if (target.components) {
                    var componentsWithDataType = [];
                    target.components.forEach(function (component) {
                        if (checkIfFiltersFulfilled(searchRequest.componentIds, componentTypes, componentNames, component)) {
                            componentsWithDataType.push({
                                componentId: component.cid,
                                componentType: component.componentType.id,
                                componentName: component.name,
                                dataType: component.componentType.dataType
                            });
                        }
                    });

                    if (componentsWithDataType.length > 0) {
                        deviceData.push({
                            deviceId: target.deviceId,
                            deviceName: target.name,
                            accountId: accountId,
                            tags: target.tags,
                            components: componentsWithDataType
                        });
                    }
                }
            });
        } else {
            return resultCallback(errFindDevices, null);
        }

        if (deviceData.length > 0) {
            searchRequest.deviceDataList = deviceData;
            searchRequest.accountId = accountId;
            delete searchRequest.deviceIds;
            delete searchRequest.gatewayIds;
            delete searchRequest.componentIds;
            delete searchRequest.devCompAttributeFilter;
            proxy.dataInquiryAdvanced(searchRequest, function (err, result, isBinary) {
                if (!err) {
		    // Some error happens in this part, it is not about parsing
		    result.data.forEach(function (dataItem) {
                        dataItem.components.forEach(function (cmp) {
                            if ("samples" in cmp) {
                                cmp.samples.forEach(function (sample) {
                                    sample[1] = new ReturnValuesTransformer(cmp.dataType, sample[1]).transform();
			        });
                            }
                        });
		    });
                    resultCallback(null, result, isBinary);
                } else if (result) {
                    resultCallback(err, result);
                } else {
                    resultCallback(err, null);
                }
            });
        } else {
            // we return empty response instead of error to keep backward compatibility
            resultCallback(null, {data:[]});
        }
    });
};


var getFromDependingOnPeriod = function(period) {
    var PERIOD_AS_SECONDS = {
        'last_year':    -3600 * 24 * 365,
        'last_month':   -3600 * 24 * 30,
        'last_week':    -3600 * 24 * 7,
        'last_day':     -3600 * 24,
        'last_hour':    -3600,
        'total':         0.0
    };
    if (PERIOD_AS_SECONDS[period]  === undefined) {
        return PERIOD_AS_SECONDS.last_hour;
    } else {
        return PERIOD_AS_SECONDS[period];
    }
};

exports.getTotals = function(accountId, period, resultCallback){
    var filters = {
        criteria: {
            status: {operator: "eq", value: "active"}
        }
    };

    findDevices(accountId, filters, function (errFindDevices, resolvedDevices) {
        var deviceData = [];
        if (!errFindDevices) {
            resolvedDevices.forEach(function (target) {
                if (target.components) {
                    var componentsWithDataType = [];
                    target.components.forEach(function (component) {
                        componentsWithDataType.push({
                            componentId: component.cid,
                            componentType: component.componentType.id,
                            componentName: component.name,
                            dataType: component.componentType.dataType
                        });

                    });

                    if (componentsWithDataType.length > 0) {
                        deviceData.push({
                            deviceId: target.deviceId,
                            deviceName: target.name,
                            accountId: accountId,
                            tags: target.tags,
                            components: componentsWithDataType
                        });
                    }
                }
            });
        } else {
            return resultCallback(errFindDevices, null);
        }

        if (deviceData.length > 0) {
            var searchRequest = {
                deviceDataList: deviceData,
                from: getFromDependingOnPeriod(period),
                countOnly: true,
                accountId: accountId
            };

            proxy.dataInquiryAdvanced(searchRequest, function (err, result) {
                if (!err) {
                    var resp = {
                        count: result.rowCount
                    };
                    resultCallback(null, resp);
                } else if (result) {
                    resultCallback(err, result);
                } else {
                    resultCallback(err, null);
                }
            });
        } else {
            // we return empty response instead of error to keep backward compatibility
            resultCallback(null, {data:[]});
        }
    });
};

exports.report = function(accountId, reportRequest, resultCallback) {
    AccountAPI.getAccount(accountId, function(e, foundAccount){
        if (!e && foundAccount) {
            reportRequest.domainId = foundAccount.public_id;
            proxy.report(reportRequest, function (err, result) {
                if (!err) {
                    resultCallback(null, result);
                } else {
                    resultCallback(err, null);
                }
            });
        } else {
            resultCallback(e);
        }
    });
};

exports.firstLastMeasurement = function (accountId, data, resultCallback) {
    data.domainId = accountId;
    // validation for components - all of them should exist and be assigned to specific account
    Component.getByCustomFilter(accountId, {componentIds: data.components}, function (errGetComponents, filteredComponents) {
        if (!errGetComponents && filteredComponents && filteredComponents.length > 0) {
            data.components = [];
            filteredComponents.forEach(function (comp) {
                data.components.push(comp.cid);
            });

            proxy.getFirstAndLastMeasurement(data, function (err, result) {
                if (!err) {
                    resultCallback(null, result);
                } else if (result) {
                    resultCallback(err, result);
                } else {
                    resultCallback(err, null);
                }
            });
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.Device.Component.NotFound));
        }
    });

};

var writeSeriesToCsvLines = function (series) {
    var lines = [ 'Device Id,Device Name,Component Id,Component Name,Component Type,Time Stamp,Value' ];
    if (series) {
        series.forEach(function (serie) {
            if (serie.points) {
                serie.points.forEach(function (point) {
                    lines.push([ serie.deviceId, serie.deviceName, serie.componentId, serie.componentName, serie.componentType, point.ts, point.value].join(','));
                });
            }
        });
    }
    return lines;
};

exports.exportToCsv = function(accountId, searchRequest, resultCallback) {
    this.search(accountId, searchRequest, function(err, res) {
        if (err) {
            resultCallback(err, res);
        } else {
            if (res) {
                var lines = writeSeriesToCsvLines(res.series);
                res.csv = lines.join('\n');
            }
            resultCallback(null, res);
        }
    });
};


exports.sendByEmail = function(accountId, searchRequest, resultCallback) {
    var recipients = searchRequest.recipients;
    delete searchRequest.recipients;
    if (!recipients || recipients.length === 0) {
        resultCallback(errBuilder.build(errBuilder.Errors.Data.SendByEmail.NoRecipientsProvided));
    } else {
        this.exportToCsv(accountId, searchRequest, function (err, res) {
            if (err) {
                resultCallback(err, res);
            } else {
                var subject = 'OISP measures - Intel(r) Corporation';
                var attachments = [
                    { 'filename': res.from + '-' + res.to + '.csv', 'contents': res.csv }
                ];
                recipients.forEach(function (email) {
                    UsersAPI.searchUser(email, function (err, user) {
                        if (user) {
                            if (user.accounts && user.accounts[accountId]) {
                                var mail = { subject: subject, attachments: attachments, email: email };
                                logger.debug('Sending email to ' + mail.email);
                                mailer.send('measures', mail);
                            } else {
                                logger.debug('User with email ' + email + ' does not belong to account ' + accountId);
                            }
                        } else {
                            logger.debug('User with email ' + email + ' not found');
                        }
                    });
                });
                resultCallback(null);
            }
        });
    }
};
