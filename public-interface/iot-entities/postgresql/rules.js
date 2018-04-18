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
    accountInterpreter = require('../../lib/interpreter/postgresInterpreter').accounts(),
    sequelize = require('./models').sequelize,
    uuid = require('node-uuid');


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
    return rules.find(filter)
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

    return rules.find(filter)
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

exports.addRuleExecution = function (ruleId, ruleExecutions) {

    var getReplacements = function(executions) {
        var replacements = [];
        executions.forEach(function(execution) {
            replacements.push(uuid.v4());
            replacements.push(execution.lastExecution);
            replacements.push(ruleId);
            replacements.push(execution.cid);
            if (execution.lastObservation) {
                replacements.push(execution.lastObservation);
            }
        });
        replacements.push(executions[0].lastExecution);
        return replacements;
    };

    var getInsertValues = function(executions) {
        var insertValues = '';
        executions.forEach(function(execution) {
            insertValues += "(?, to_timestamp(?) AT TIME ZONE 'UTC', ?, ?,";
            if (execution.lastObservation) {
                insertValues += "to_timestamp(?) AT TIME ZONE 'UTC'),";
            } else {
                insertValues += "CAST(NULL AS TIMESTAMP)),";
            }
        });
        return insertValues;
    };

    var getQuery = function(insertValues) {
        return 'WITH insert_rows AS (' +
                'SELECT uuid(id) as id, start, uuid(rule_id) as rule_id, device_component_id, last_observation_time ' +
                'FROM (VALUES ' + insertValues.substring(0, insertValues.length - 1) + ')' +
                's(id, start, rule_id, device_component_id, last_observation_time) ' +
            '),' +
            'to_update AS (' +
                'Update "dashboard"."rule_executions" re set ' +
                    "start = insert_rows.start, " +
                    'last_observation_time = insert_rows.last_observation_time ' +
                'FROM insert_rows ' +
                'WHERE insert_rows.rule_id = re.rule_id AND ' +
                    'insert_rows.device_component_id = re.device_component_id ' +
                'RETURNING re.* ' +
            ')' +
            'INSERT INTO "dashboard"."rule_executions" (id, start, rule_id, device_component_id, last_observation_time) ' +
            'SELECT insert_rows.* ' +
            'FROM insert_rows LEFT JOIN to_update ' +
                'using(rule_id, device_component_id) ' +
            'WHERE to_update.id IS NULL;';
    };

    return sequelize.query(getQuery(getInsertValues(ruleExecutions)), {replacements: getReplacements(ruleExecutions)})
        .catch(function (err) {
            if (err.name === errBuilder.SqlErrors.ForeignKeyNotFound) {
                throw errBuilder.Errors.Rule.NotFound;
            }
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
        }
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

    var parseResult = function(rules) {

        var createRuleExecution = function(rule, device_component_id) {
            if (device_component_id) {
                rule.executions[device_component_id] = {
                    'last_execution_time': rule.last_execution_time,
                    'last_obs_trigger_time': rule.last_obs_trigger_time
                };
            }
        };

        var parsed_rules = {};
        rules.forEach(function(rule) {
            if (rule.id in parsed_rules) {
                if (rule.device_component_id) {
                    createRuleExecution(parsed_rules[rule.id], rule.device_component_id);
                }
            } else {
                rule.executions = {};
                createRuleExecution(rule, rule.device_component_id);
                parsed_rules[rule.id] = rule;
            }
        });
        return Object.keys(parsed_rules).map(function(key) {
            return parsed_rules[key];
        });
    };

    var QUERY = 'SELECT ' +
        '"externalId", ' +
        '"accountId", ' +
        '"deviceNames", ' +
        '"deviceTags", ' +
        '"devices", ' +
        '"conditions", ' +
        '"device_component_id", ' +
        '"rules"."id", ' +
        'extract(epoch from executions."start" AT TIME ZONE \'UTC\')::integer AS "last_execution_time", ' +
        'extract(epoch from executions."last_observation_time" AT TIME ZONE \'UTC\')::integer AS "last_obs_trigger_time" ' +
        'FROM "dashboard"."rules" rules ' +
        'LEFT JOIN "dashboard"."rule_executions" executions on "rules"."id" = "executions"."rule_id" ' +
        'WHERE "rules"."status" = :status';

    return sequelize.query(QUERY, {replacements: {status: status}})
        .then(function (result) {
            if (result && result.length > 0 && result[0]) {
                var rules = result[0];
                return parseResult(rules);
            } else {
                throw errBuilder.Errors.User.SavingError;
            }
        }).catch(function (err) {
            throw err;
        });
};

exports.all = function (accountId) {
    var filter = {
        where: {
            accountId: accountId
        }
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
        }
    };
    return rules.findAll(filter).then(function(allRules) {
        return interpreterHelper.mapAppResults(allRules, ruleInterpreter);
    });
};

exports.findBySynchronizationStatus = function(status, synchronizationStatus) {
    var filter = {
        where: {
            status: status
        }
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
            { model: rules,
                where: {'externalId' : externalId}
            }
        ]
    };

    return accounts.find(filter)
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
        }]
    };

    return users.find(filter)
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
