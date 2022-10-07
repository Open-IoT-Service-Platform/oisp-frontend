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

var rules = require('./models').rules,
    accounts = require('./models').accounts,
    users = require('./models').users,
    interpreterHelper = require('../../lib/interpreter/helper'),
    Q = require('q'),
    errBuilder = require("../../lib/errorHandler/index").errBuilder,
    ruleInterpreter = require('../../lib/interpreter/postgresInterpreter').rules(),
    userInterpreter = require('../../lib/interpreter/postgresInterpreter').users(),
    accountInterpreter = require('../../lib/interpreter/postgresInterpreter').accounts();


var ruleStatus = {active: 'Active', archived: 'Archived', onhold: 'On-hold', draft: 'Draft', deleted: 'Deleted'};
var ruleSynchronizationStatus = {synchronized: 'Sync', notsynchronized: 'NotSync'};
exports.ruleStatus = ruleStatus;
exports.ruleSynchronizationStatus = ruleSynchronizationStatus;

var create = function (rule) {
    var ruleModel = ruleInterpreter.toDb(rule);
    return rules.create(ruleModel)
        .then(function (rule) {
            return Q.resolve(interpreterHelper.mapAppResults(rule, ruleInterpreter));
        })
        .catch(function (err) {
            throw err;
        });
};

exports.new = create;

exports.findByExternalIdAndAccount = function (externalId, accountId) {
    var filter = {
        where: {
            accountId: accountId,
            externalId: externalId
        }
    };
    return rules.findOne(filter)
        .then(function (rule) {
            if (!rule) {
                throw errBuilder.Errors.Rule.NotFound;
            }
            return Q.resolve(interpreterHelper.mapAppResults(rule, ruleInterpreter));
        })
        .catch(function (err) {
            throw err;
        });
};

var update = function (externalId, accountId, data) {
    var filter = {
        where: {
            externalId: externalId
        },
        returning: true
    };

    if (accountId) {
        filter.where.accountId = accountId;
    }
    var ruleModel = ruleInterpreter.toDb(data);
    return rules.update(ruleModel, filter)
        .then(function (updatedRule) {
            if (updatedRule && updatedRule.length > 1) {
                return Q.resolve(interpreterHelper.mapAppResults(updatedRule[1][0], ruleInterpreter));
            } else {
                return null;
            }
        })
        .catch(function (err) {
            throw err;
        });
};

exports.update = update;

exports.addOrUpdateDraft = function (externalId, accountId, data) {

    var filter = {
        where: {
            accountId: accountId,
            externalId: externalId
        },
        returning: true
    };

    return rules.findOne(filter)
        .then(function (rule) {
            if (rule) {
                return update(externalId, accountId, data)
                    .then(function(updatedRule){
                        return updatedRule;

                    });
            } else {
                return create(data)
                    .then(function(createdRule){
                        return createdRule;
                    });
            }
        })
        .catch(function (err) {
            throw err;
        });
};

exports.deleteDraft = function (externalId, accountId) {
    var filter = {
        where: {
            accountId: accountId,
            externalId: externalId,
            status: ruleStatus.draft
        }
    };
    return rules.destroy(filter)
        .then(function (removedRulesCounter) {
            if (removedRulesCounter > 0) {
                return null;
            } else {
                throw errBuilder.Errors.Rule.NotFound;
            }
        })
        .catch(function (err) {
            throw err;
        });
};

exports.deleteRule = function (externalId, accountId) {
    var filter = {
        where: {
            accountId: accountId,
            externalId: externalId
        }
    };
    return rules.destroy(filter)
        .then(function (removedRulesCounter) {
            if (removedRulesCounter > 0) {
                return null;
            } else {
                throw errBuilder.Errors.Rule.NotFound;
            }
        })
        .catch(function (err) {
            throw err;
        });
};

exports.deleteRulesByStatus = function (externalId, status) {
    var filter = {
        where: {
            status: status,
            externalId: externalId
        }
    };
    return rules.destroy(filter)
        .catch(function (err) {
            throw err;
        });
};

exports.allDrafted = function (accountId) {
    var filter = {
        where: {
            accountId: accountId,
            status: ruleStatus.draft
        },
        order: [
            ['created', 'ASC']
        ]
    };
    filter.attributes = ['id', 'externalId', 'name', 'description', 'owner', 'created', 'updated', 'priority', 'status',
        'deviceNames', 'deviceTags', 'devices', 'deviceAttributes'];

    return rules.findAll(filter)
        .then(function (rules) {
            return Q.resolve(interpreterHelper.mapAppResults(rules, ruleInterpreter));
        })
        .catch(function (err) {
            throw err;
        });
};

exports.allByStatus = function (status) {
    var filter = {
        where: {
            status: status
        },
        attributes: [
            'id', 'externalId', 'name', 'description', 'owner', 'created',
            'updated', 'priority', 'status', 'deviceNames', 'deviceTags',
            'devices', 'deviceAttributes', 'naturalLanguage', 'synchronizationStatus'
        ],
        order: [
            ['created', 'ASC']
        ]
    };

    return rules.findAll(filter)
        .then(result => {
            if (result) {
                return Q.resolve(interpreterHelper.mapAppResults(result, ruleInterpreter));
            } else {
                throw errBuilder.Errors.User.Saving.Error;
            }
        }).catch(err => {
            throw err;
        });
};

exports.all = function (accountId) {
    var filter = {
        where: {
            accountId: accountId
        },
        order: [
            ['created', 'ASC']
        ]
    };
    filter.attributes = ['id', 'externalId', 'name', 'description', 'owner', 'created', 'updated', 'priority', 'status',
        'deviceNames', 'deviceTags', 'devices', 'deviceAttributes', 'naturalLanguage', 'synchronizationStatus'];

    return rules.findAll(filter)
        .then(function (rules) {
            return Q.resolve(interpreterHelper.mapAppResults(rules, ruleInterpreter));
        })
        .catch(function (err) {
            throw err;
        });
};

exports.findByStatus = function(status) {
    var filter = {
        where: {
            status: status
        },
        order: [
            ['created', 'ASC']
        ]
    };
    return rules.findAll(filter).then(function(allRules) {
        return interpreterHelper.mapAppResults(allRules, ruleInterpreter);
    });
};

exports.findBySynchronizationStatus = function(status, synchronizationStatus) {
    var filter = {
        where: {
            status: status
        },
        order: [
            ['created', 'ASC']
        ]
    };
    if (synchronizationStatus) {
        filter.where.synchronizationStatus = synchronizationStatus;
    }
    return rules.findAll(filter).then(function(allRules) {
        return interpreterHelper.mapAppResults(allRules, ruleInterpreter);
    });
};

exports.findAccountWithRule = function (accountId, externalId) {
    var filter = {
        where : { 'id' : accountId},
        include : [
            {
                model: rules,
                where: {'externalId' : externalId}
            }
        ],
        order: [
            [rules, 'created', 'ASC']
        ]
    };

    return accounts.findOne(filter)
        .then(function(result){
            if(result) {
                var results = {
                    account: interpreterHelper.mapAppResults(result, accountInterpreter),
                    rule: interpreterHelper.mapAppResults(result.rules[0], ruleInterpreter)
                };
                return results;
            }
            else {
                throw errBuilder.Errors.Rule.NotFound;
            }
        })
        .catch(function(err){
            throw err;
        });
};

exports.findUserWithAccountAndRule = function (userId, accountId, ruleId) {
    var filter = {
        where : { 'id' : userId},
        include : [{
            model: accounts, where: {'id': accountId},
            include: [{model: rules, where: {'externalId': ruleId}}]
        }],
        order: [
            [accounts, 'created', 'ASC'],
            [accounts, rules, 'created', 'ASC']
        ]
    };

    return users.findOne(filter)
        .then(function(result){
            if(result) {
                var results = {
                    user: interpreterHelper.mapAppResults(result, userInterpreter),
                    account: interpreterHelper.mapAppResults(result.accounts[0], accountInterpreter),
                    rule: interpreterHelper.mapAppResults(result.accounts[0].rules[0], ruleInterpreter)
                };

                return results;
            }
            else {
                throw errBuilder.Errors.Rule.NotFound;
            }
        })
        .catch(function(err){
            throw err;
        });
};
