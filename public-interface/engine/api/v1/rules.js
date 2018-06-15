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
    Rule = postgresProvider.rules,
    Account = postgresProvider.accounts,
    User = postgresProvider.users,
    errBuilder = require('../../../lib/errorHandler/index').errBuilder,
    rulesBuilder = require('../helpers/rules-builder'),
    RuleValidator = require('../helpers/index').rulesValidator,
    validator = new RuleValidator(),
    uuid = require('node-uuid'),
    Q = require('q'),
    rulesUpdateNotifier = require('../helpers/rules-update-notifier');

var buildInternalRule = function (options) {
    var accountId = ((typeof options.domainId) === 'object' && (typeof options.domainId.public_id) === 'string') ? options.domainId.public_id : options.domainId,
        user = options.user,
        internalRule = options.rule;

    internalRule.owner = user.email;
    internalRule.status = options.status;

    return Q.nfcall(rulesBuilder.formatRule, accountId, user, internalRule)
        .then(function (externalRule) {
            return externalRule;
        });
};

var addRule = function (options, callback) {
    var accountId = options.domainId,
        userId = options.userId,
        rule = options.rule,
        validationErrors = validator.validate(rule);

    if (validationErrors.length === 0) {
        return User.findById(userId)
            .then(function (user) {
                if (!user) {
                    throw errBuilder.Errors.User.NotFound;
                }
                return Q.nfcall(Account.find, accountId)
                    .then(function (account) {
                        if (!account) {
                            throw errBuilder.Errors.Account.NotFound;
                        }
                        return  Q.nfcall(validator.validateDevicesHasComponents, rule, accountId)
                            .then(function(){
                                rule.externalId = rule.externalId || uuid.v4();
                                rule.id = rule.id || rule.externalId ;
                                var opt = {
                                    rule: rule,
                                    domainId: accountId,
                                    user: user,
                                    status: Rule.ruleStatus.active
                                };
                                return buildInternalRule(opt)
                                    .then(function(internalRule) {
                                        return Rule.addOrUpdateDraft(rule.externalId, accountId, internalRule).
                                            then(function(rule){
                                                callback(null, rule);
                                            });
                                    });
                            });

                    });
            })
            .then(function (result) {
                rulesUpdateNotifier.notify();
                callback(null, result);
            })
            .catch(function (err) {
                var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
                if (err && err.code) {
                    errMsg = errBuilder.build(err);
                }
                callback(errMsg);
            });
    } else {
        callback(errBuilder.build(errBuilder.Errors.Rule.InvalidData, validationErrors));
    }
};

var deleteRule = function (options, callback) {
    var accountId = options.domainId,
        externalId = options.externalId;

    var deletedRuleData = {
        status: Rule.ruleStatus.deleted,
        synchronizationStatus: Rule.ruleSynchronizationStatus.notsynchronized
    };

    return Rule.update(externalId, accountId, deletedRuleData)
        .then(function (result) {
            callback(null, result);
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            callback(errMsg);
        });
};

var getRule = function (options, resultCallback) {
    var accountId = options.domainId,
        externalId = options.externalId || options.ruleId;

    return Rule.findAccountWithRule(accountId, externalId)
        .then(function (results) {
            return results.rule;
        })
        .then(function (res) {
            return resultCallback(null, res);
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            return resultCallback(errMsg);
        });
};

var getRules = function (accountId, resultCallback) {
    return Rule.all(accountId)
        .then(function (res) {
            resultCallback(null, res);
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            resultCallback(errMsg);
        });
};

function distinct(arr) {
    return arr.filter(function(value, index, self) {
        return self.indexOf(value) === index;
    });
}

var groupByComponentId = function (status, synchronizationStatus, resultCallback) {
    var byCompId = {};
    return Rule.findBySynchronizationStatus(status, synchronizationStatus).then(function (allRules) {
        //create a dict {component_id: [list of rules]}
        allRules.forEach(function(rule) {
            var compIds = rule.conditions.values.map(function (cond) {
                return cond.component.cid;
            });
            compIds = distinct(compIds);
            compIds.forEach(function (compId) {
                if (compId === undefined) {
                    return;
                }
                if (byCompId[compId] === undefined) {
                    byCompId[compId] = [];
                }
                byCompId[compId].push(rule);
            });
        });
        //create a list of objects with component ids and their rules
        var result = [];
        for (var compId in byCompId) {
            result.push({componentId: compId, rules: byCompId[compId]});
        }
        resultCallback(null, result);
    }).catch(function (err) {
        var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
        if (err && err.code) {
            errMsg = errBuilder.build(err);
        }
        resultCallback(errMsg);
    });
    //note: alternatively one can query json directly from postgres (including creating indexes), eg.:
    //var q = "select json_array_elements(conditions->'values')->'component'->>'cid' as cid, * from dashboard.rules order by cid";
    //this query returns a row for each pair of (component_id, one of its rules)
};

var isRuleStatusValid = function(status) {
    var rule_statuses = Object.keys(Rule.ruleStatus).map(function (key) {
        return Rule.ruleStatus[key];
    });

    return status && rule_statuses.indexOf(status) !== -1;
};

var getRulesByStatus = function (status, resultCallback) {
    if (!isRuleStatusValid(status)) {
        resultCallback(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
    } else {
        return Rule.allByStatus(status)
            .then(function (res) {
                resultCallback(null, res);
            })
            .catch(function (err) {
                var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
                if (err && err.code) {
                    errMsg = errBuilder.build(err);
                }
                resultCallback(errMsg);
            });
    }
};

var updateRule = function (options, callback) {
    var accountId = options.domainId,
        userId = options.user,
        rule = options.rule,
        externalId = options.externalId,
        validationErrors = validator.validate(rule);

    if (rule.status === Rule.ruleStatus.draft) {
        callback(errBuilder.build(errBuilder.Errors.Rule.InternalError.SavingNonDraftError));
    }

    if (validationErrors.length === 0) {
        return Rule.findUserWithAccountAndRule(userId, accountId, externalId)
            .then(function () {
                return User.findById(userId)
                    .then(function (user) {
                        if (!user) {
                            throw errBuilder.Errors.User.NotFound;
                        }
                        return  Q.nfcall(validator.validateDevicesHasComponents, rule, accountId)
                            .then(function(){
                                rule.externalId = externalId;

                                var opt = {
                                    externalRule: rule,
                                    rule: rule,
                                    domainId: accountId,
                                    user: user,
                                    status: rule.status,
                                    synchronizationStatus: Rule.ruleSynchronizationStatus.notsynchronized
                                };

                                opt.externalId = externalId;
                                return buildInternalRule(opt)
                                    .then(function (internalRule) {
                                        return Rule.addOrUpdateDraft(rule.externalId, accountId, internalRule);
                                    }).catch(function () {
                                        throw errBuilder.Errors.Rule.InternalError.UpdatingError;
                                    });
                            });
                    })
                    .then(function (res) {
                        callback(null, res);
                    });
            })
            .then(function (result) {
                rulesUpdateNotifier.notify();
                callback(null, result);
            })
            .catch(function (err) {
                var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
                if (err && err.code) {
                    errMsg = errBuilder.build(err);
                }
                callback(errMsg);
            });
    } else {
        callback(errBuilder.build(errBuilder.Errors.Rule.InvalidData, validationErrors));
    }
};

var updateRuleStatus = function (options, callback) {
    var accountId = options.domainId,
        externalId = options.externalId,
        status = options.status;

    return Rule.findAccountWithRule(accountId, externalId)
        .then(function (results) {
            var rule = {
                externalId: externalId,
                lastUpdateDate: results.rule.lastUpdateDate,
                status: status,
                synchronizationStatus: Rule.ruleSynchronizationStatus.notsynchronized
            };

            return Rule.update(rule.externalId, results.account.public_id, rule)
                .then(function (savedRule) {
                    return savedRule;
                })
                .catch(function () {
                    throw errBuilder.Errors.Rule.InternalError.UpdatingError;
                });
        })
        .then(function (result) {
            rulesUpdateNotifier.notify();
            callback(null, result);
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            callback(errMsg);
        });
};

var isRuleSynchronizationStatusValid = function(synchronizationStatus) {
    var isValid = false;
    Object.keys(Rule.ruleSynchronizationStatus).forEach(function(status) {
        if (Rule.ruleSynchronizationStatus[status] === synchronizationStatus) {
            isValid = true;
        }
    });

    return isValid;
};

var deleteRulesWithDeletedStatus = function(rulesExternalIds, synchronizationStatus) {
    if (synchronizationStatus === Rule.ruleSynchronizationStatus.synchronized) {
        return Rule.deleteRulesByStatus(rulesExternalIds, Rule.ruleStatus.deleted);
    } else {
        return Q.resolve();
    }
};

var updateRuleSynchronizationStatus = function (synchronizationStatus, rulesExternalIds) {
    if (!isRuleSynchronizationStatusValid(synchronizationStatus)) {
        return Q.reject(errBuilder.build(errBuilder.Errors.Rule.InvalidSynchronizationStatus));
    }

    return deleteRulesWithDeletedStatus(rulesExternalIds, synchronizationStatus)
        .then(function () {
            return Rule.update(rulesExternalIds, null, {synchronizationStatus: synchronizationStatus});
        })
        .then(function (updatedRules) {
            return updatedRules;
        })
        .catch(function () {
            throw errBuilder.Errors.Rule.InternalError.UpdatingError;
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            throw errMsg;
        });
};

var addRuleExecution = function (ruleId, ruleExecutions) {

    return Rule.addRuleExecution(ruleId, ruleExecutions)
        .then(function (savedRule) {
            return savedRule;
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            throw errMsg;
        });
};

var addRuleAsDraft = function (options, callback) {
    var rule = options.rule;
    return User.findById(options.userId)
        .then(function (user) {
            if (!user) {
                throw errBuilder.Errors.User.NotFound;
            }
            rule.externalId = options.rule.externalId || uuid.v4();
            rule.id = rule.externalId;
            var opt = {
                rule: options.rule,
                domainId: options.domainId,
                user: user,
                status: Rule.ruleStatus.draft
            };
            return buildInternalRule(opt)
                .then(function(internalRule) {
                    return Rule.addOrUpdateDraft(rule.externalId, opt.domainId, internalRule)
                        .then(function (savedRule) {
                            callback(null, savedRule);
                        });
                });
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            callback(errMsg);
        });
};

var deleteDraft = function (options, callback) {
    var accountId = options.domainId,
        externalId = options.externalId;

    return Rule.deleteDraft(externalId, accountId)
        .then(function (result) {
            callback(null, result);
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            callback(errMsg);
        });
};

var buildCloneRule = function (accountId, userId, externalRule) {
    var ruleObj = {
        domainId: accountId,
        userId: userId,
        rule: {
            name: externalRule.name + ' - cloned',
            priority: externalRule.priority,
            type: externalRule.type,
            status: externalRule.status,
            resetType: externalRule.resetType,
            actions: externalRule.actions,
            population: externalRule.population,
            conditions: externalRule.conditions,
            description: externalRule.description
        }
    };
    return ruleObj;
};

var cloneRule = function (options, callback) {
    var accountId = options.domainId,
        userId = options.userId;

    return getRule(options, function (err, externalRule) {
        if (!err) {
            var obj = buildCloneRule(accountId, userId, externalRule);
            return addRule(obj, function (err, savedRule) {
                if (!err) {
                    callback(null, savedRule);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(errBuilder.build(errBuilder.Errors.Rule.NotFound));
        }
    });
};

module.exports = {
    addRule: addRule,
    cloneRule: cloneRule,
    getRule: getRule,
    getRules: getRules,
    updateRule: updateRule,
    updateRuleStatus: updateRuleStatus,
    addRuleAsDraft: addRuleAsDraft,
    deleteDraft: deleteDraft,
    deleteRule: deleteRule,
    getRulesByStatus: getRulesByStatus,
    addRuleExecution: addRuleExecution,
    groupByComponentId: groupByComponentId,
    updateRuleSynchronizationStatus: updateRuleSynchronizationStatus
};
