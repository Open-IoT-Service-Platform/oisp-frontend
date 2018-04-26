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
    Alert = postgresProvider.alerts,
    Account = postgresProvider.accounts,
    apiRules = require('./rules'),
    errBuilder = require("../../../lib/errorHandler").errBuilder,
    logger = require('../../../lib/logger').init(),
    async = require('async'),
    actuationAlerts = require('../helpers/actuationAlerts'),
    uuid = require('node-uuid');

exports.reset = function (params, resultCallback) {

    Account.find(params.accountId, function (err, account) {
        if (!err && account) {
            Alert.updateById(account.public_id, params.alertId,
                {
                    status: Alert.status.closed,
                    updated: Date.now(),
                    reset: Date.now(),
                    resetType: Alert.resetType.manual
                },
                resultCallback);
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.Alert.AccountNotFound));
        }
    });
};

exports.bulkReset = function (resetData, resultCallback) {
    async.parallel(resetData.map(function (reset) {
        return function (done) {
            Account.getAccount(reset.accountId, function (err, account) {
                if (!err && account) {
                    Alert.updateById(account.public_id,
                        reset.alertId.toString(),
                        {
                            status: Alert.status.closed,
                            updated: Date.now(),
                            reset: reset.timestamp,
                            resetType: Alert.resetType.automatic
                        },
                        function (err, result) {
                            if (err || result !== 1) {
                                reset.err = errBuilder.build(errBuilder.Errors.Alert.NotFound).asResponse();
                            }
                            delete reset.timestamp;
                            done(null, reset);
                        });
                } else {
                    reset.err = errBuilder.build(errBuilder.Errors.Alert.AccountNotFound).asResponse();
                    delete reset.timestamp;
                    done(null, reset);
                }
            });
        };
    }), function (err, results) {
        if (!err && results.length > 0) {
            resultCallback(null, results);
        } else {
            resultCallback(err);
        }
    });
};

exports.changeStatus = function (params, resultCallback) {
    if (!params.status || !(Alert.isStatusValid(params.status))) {
        resultCallback(errBuilder.build(8405));
    } else {
        Alert.updateById(params.accountId, params.alertId.toString(), {
            'status': params.status,
            'st_on': Date.now()
        }, resultCallback);
    }
};

function toInternalAlert(accountId, externalAlert, rule, deviceComponent) {
    var item = {};
    item.accountId = accountId;
    item.alertId = uuid.v4();
    item.deviceId = externalAlert.deviceId || deviceComponent.device.id;
    item.ruleId = rule.ruleId;
    item.ruleName = rule.name;
    item.priority = rule.priority;
    item.triggered = externalAlert.timestamp;
    item.dashboardObservationReceivedOn = externalAlert.systemOn;
    item.dashboardAlertReceivedOn = Date.now();
    item.naturalLangAlert = rule.naturalLanguage;
    item.resetType = rule.resetType;

    item.conditions = externalAlert.conditions.map(function (condition) {
        return {
            sequence: condition.conditionSequence,
            condition: rule.naturalLanguage,
            components: condition.components.map(function(component) {
                return {
                    "componentId": component.componentId,
                    "componentName": component.componentName || deviceComponent.name,
                    "valuePoints": component.valuePoints
                };
            })
        };
    });

    return item;
}

function parseAlertResponse(data) {

    var results = [];
    data.forEach(function (alert) {
        if (alert && (typeof alert === "object")) {
            results.push(
                {
                    accountId: alert.accountId,
                    alertId: alert.alertId,
                    err: alert.err
                });
        }
    });

    return results;
}

var findDeviceForAlert = function(alert, callback) {
    Device.findByComponentId(alert.conditions[0].components[0].componentId, callback);
};

exports.trigger = function (alertData, accountId, hostUrl, resultCallback) {

    async.parallel(alertData.map(function (alert) {
        return function (done) {

            var accountId = alert.accountId ;
            var options = {
                domainId: accountId,
                externalId: alert.ruleId.toString()
            };
            apiRules.getRule(options, function (err, rule) {
                if (!err && rule) {
                    findDeviceForAlert(alert, function(err, deviceComponent) {
                        if (!err) {
                            //to internal from rule
                            var internalAlert = toInternalAlert(accountId, alert, rule, deviceComponent);
                            internalAlert["externalId"] = rule.externalId;
                            Alert.new(internalAlert, function(err){
                                if (err) {
                                    logger.error('alerts. trigger, error: ' + JSON.stringify(err));
                                    alert.err = errBuilder.build(errBuilder.Errors.Alert.SavingErrorAA).asResponse();
                                } else {
                                    if(hostUrl.indexOf('internal-') > -1) {
                                        internalAlert.host = hostUrl.substr(hostUrl.indexOf('-')+1);
                                    }
                                    else {
                                        internalAlert.host = hostUrl;
                                    }

                                    internalAlert.externalRule = rule;
                                    actuationAlerts.addCommandsToActuationActions(accountId, rule)
                                        .then(function onSuccess() {
                                            actuationAlerts.saveAlertActuations(rule.actions, function (err) {
                                                if (err) {
                                                    logger.error('alerts.saveActuations - unable to add new actuation message into DB: ' + JSON.stringify(err));
                                                }
                                            });
                                            process.emit("incoming_alert", {alert: internalAlert, rule: rule});
                                        }, function onError(err) {
                                            logger.error('alerts.getCommands, error: ' + JSON.stringify(err));
                                        });
                                }
                                done(null, alert);
                            });
                        } else {
                            logger.error('alerts. trigger, error: ' + JSON.stringify(err));
                            alert.err = errBuilder.build(errBuilder.Errors.Alert.SavingErrorAA).asResponse();
                        }
                    });

                }
                else {
                    alert.err = errBuilder.build(errBuilder.Errors.Alert.RuleNotFound).asResponse();
                    logger.error('alerts. trigger, error: ' + JSON.stringify(alert));
                    done(null, alert);
                }
            });
        };
    }), function (err, results) {
        if (!err && results.length > 0) {
            resultCallback(null, parseAlertResponse(results));
        } else {
            resultCallback(err);
        }
    });
};

exports.getUnreadAlerts = function (params, resultCallback) {

    Alert.findByStatus(params.accountId, params.status, function (err, result) {
        resultCallback(err, result);
    });
};

exports.getAlerts = function (params, resultCallback) {

    Alert.findByStatus(params.accountId, params.status, function (err, result) {
        resultCallback(err, result);
    });
};

exports.deleteAlerts = function (params, resultCallback) {

        Alert.deleteAlerts(params.accountId, params.status, function (err, result) {
            resultCallback(err, result);
        });
};

exports.deleteAlert = function (params, resultCallback) {

        Alert.deleteByExternalId(params.accountId, params.alertId, function (err, result) {
            resultCallback(err, result);
        });
};

exports.getAlert = function (params, resultCallback) {

    Alert.findByExternalId(params.accountId, params.alertId, function (err, alert) {
        if (!err && alert) {
            resultCallback(null, alert);
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.Alert.NotFound));
        }
    });
};

exports.addComments = function (comments, callback) {
    Alert.addComments(comments)
        .then(function() {
            callback();
        })
        .catch(function(err) {
            logger.error('alerts. addComments, error: ' + err);
            callback(errBuilder.build(errBuilder.Errors.Alert.SavingErrorComments));
        });
};
