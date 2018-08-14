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
var interpreter = require('../../lib/interpreter/postgresInterpreter').alerts(),
    interpreterHelper = require('../../lib/interpreter/helper'),
    alerts = require('./models').alerts,
    statuses = {new: 'New', open: 'Open', closed: 'closed'},
    resetTypes = {manual: "Manual", automatic: "Automatic"},
    alertComments = require('./models').alertComments;

exports.status = statuses;
exports.resetType = resetTypes;

exports.isStatusValid = function (status) {
    for (var property in statuses) {
        if (status === statuses[property]) {
            return true;
        }
    }
    return false;
};

exports.new = function (newAlert, callback) {

    var alertModel = interpreter.toDb(newAlert);
    alertModel["status"] = statuses.new;
    delete alertModel.id;
    return alerts.create(alertModel)
        .then(function (alert) {
            return alerts.find({where: {id: alert.id}})
                .then(function (alertFound) {
                    alertFound.externalId = newAlert.ruleId;
                    interpreterHelper.mapAppResults(alertFound, interpreter, callback);
                });
        })
        .catch(function (err) {
            callback(err);
        });

};

exports.findByStatus = function (accountId, status, callback) {
    var filter = {
        where: {
            accountId: accountId
        },
	order: 'created DESC'
    };

    if (status) {
        filter.where["status"] = status;
    }

    return alerts.findAll(filter)
        .then(function (alert) {
            interpreterHelper.mapAppResults(alert, interpreter, callback);
        })
        .catch(function (err) {
            callback(err);
        });
};

exports.deleteAlerts = function (accountId, status, callback) {
    var filter = {
        where: {
            accountId: accountId
        }
    };

    alerts.destroy(filter)
        .then(function (res) {
            callback(null, res);
        })
        .catch(function (err) {
            callback(err);
        });
};

exports.deleteByExternalId = function (accountId, alertId, callback) {
    var filter = {
        where: {
            id: alertId,
            accountId: accountId
        }
    };

    alerts.destroy(filter)
        .then(function (res) {
            callback(null, res);
        })
        .catch(function (err) {
            callback(err);
        });
};

exports.findByExternalId = function (accountId, alertId, callback) {
    var filter = {
        where: {
            id: alertId,
            accountId: accountId
        },
        include: [{model: alertComments, as: 'Comments'}],
        order: [[{model: alertComments, as: 'Comments'}, 'created', 'ASC']]
    };

    return alerts.find(filter)
        .then(function (alert) {
            interpreterHelper.mapAppResults(alert, interpreter, callback);
        })
        .catch(function (err) {
            callback(err);
        });
};

exports.updateById = function (accountId, alertId, updateFields, callback) {
    var filter = {
        where: {
            id: alertId,
            accountId: accountId
        },
        returning: true
    };

    var alertModel = updateFields;

    return alerts.update(alertModel, filter)
        .then(function (alert) {
            interpreterHelper.mapAppResults(alert[1][0], interpreter, callback);
        })
        .catch(function (err) {
            callback(err);
        });

};

exports.deleteAllByDomain = function (accountId) {
    var filter = {
        where: {
            accountId: accountId
        }
    };
    return alerts.destroy(filter);
};

exports.addComments = function (comments) {
    return alertComments.bulkCreate(comments);
};
