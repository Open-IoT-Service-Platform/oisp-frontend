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
var rules = require('../../api/v1/rules'),
    httpStatuses = require('../../res/httpStatuses');

var usage = function(req, res) {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT');
    res.status(httpStatuses.OK.code).send();
};

var getRules = function (req, res, next) {
    rules.getRules(req.params.accountId, function(err, rules){
        if (!err) {
            res.status(httpStatuses.OK.code).send(rules);
        } else {
            next(err);
        }
    });
};

var getRulesByStatus = function (req, res, next) {
    rules.getRulesByStatus(req.params.status, function(err, rules){
        if (!err) {
            res.status(httpStatuses.OK.code).send(rules);
        } else {
            next(err);
        }
    });
};

var getRule = function (req, res, next) {
    var options = {
        externalId: req.params.ruleId,
        domainId: req.params.accountId
    };

    rules.getRule(options, function(err, rule){
        if (!err) {
            res.status(httpStatuses.OK.code).send(rule);
        } else {
            next(err);
        }
    });
};

var addRule = function (req, res, next) {
    var options = {
        domainId: req.params.accountId,
        userId: req.identity,
        rule: req.body
    };

    rules.addRule(options, function(err, savedRule){
        if (!err) {
            res.status(httpStatuses.Created.code).send(savedRule);
        } else {
            next(err);
        }
    });
};

var deleteRule = function(req, res, next){
    var options = {
        domainId: req.params.accountId,
        externalId: req.params.ruleId
    };

    rules.deleteRule(options, function(err){
        if (!err) {
            res.status(httpStatuses.DeleteOK.code).send();
        } else {
            next(err);
        }
    });
};

var updateRule = function (req, res, next) {
    var options = {
        domainId: req.params.accountId,
        user: req.identity,
        rule: req.body,
        externalId: req.params.ruleId
    };

    rules.updateRule(options, function(err, savedRule){
        if (!err) {
            res.status(httpStatuses.OK.code).send(savedRule);
        } else {
            next(err);
        }
    });
};

var updateRuleStatus = function(req, res, next){
    var options = {
        domainId: req.params.accountId,
        externalId: req.params.ruleId,
        status: req.body.status
    };

    rules.updateRuleStatus(options, function(err, savedRule){
        if (!err) {
            res.status(httpStatuses.OK.code).send(savedRule);
        } else {
            next(err);
        }
    });
};

var updateRulesSynchronizationStatus = function(req, res, next){
    return rules.updateRuleSynchronizationStatus(req.params.statusId, req.body)
        .then(function (updatedRules) {
            return res.status(httpStatuses.OK.code).send(updatedRules);
        }).catch(function (err) {
            return next(err);
        });
};

var addRuleAsDraft = function(req, res, next){
    var options = {
        domainId: req.params.accountId,
        userId: req.identity,
        rule: req.body
    };

    rules.addRuleAsDraft(options, function(err, savedRule){
        if (!err) {
            res.status(httpStatuses.OK.code).send(savedRule);
        } else {
            next(err);
        }
    });
};

var deleteDraft = function(req, res, next){
    var options = {
        domainId: req.params.accountId,
        externalId: req.params.ruleId
    };

    rules.deleteDraft(options, function(err){
        if (!err) {
            res.status(httpStatuses.DeleteOK.code).send();
        } else {
            next(err);
        }
    });
};

var cloneRule = function(req, res, next){
    var options = {
        domainId: req.params.accountId,
        ruleId: req.params.ruleId,
        userId: req.identity
    };
    rules.cloneRule(options, function(err, clonedRule){
        if (!err) {
            res.status(httpStatuses.OK.code).send(clonedRule);
        } else {
            next(err);
        }
    });
};

var groupByComponentId = function(req, res, next) {
    var status = req.body.status;
    var synchronizationStatus = req.body.synchronizationStatus;
    rules.groupByComponentId(status, synchronizationStatus, function(err, result) {
        if (!err) {
            res.status(httpStatuses.OK.code).send(result);
        } else {
            next(err);
        }
    });
};

module.exports = {
    usage: usage,
    getRules: getRules,
    getRule: getRule,
    addRule: addRule,
    cloneRule: cloneRule,
    updateRule: updateRule,
    updateRuleStatus: updateRuleStatus,
    addRuleAsDraft: addRuleAsDraft,
    deleteDraft: deleteDraft,
    deleteRule: deleteRule,
    getRulesByStatus: getRulesByStatus,
    groupByComponentId: groupByComponentId,
    updateRulesSynchronizationStatus: updateRulesSynchronizationStatus
};
