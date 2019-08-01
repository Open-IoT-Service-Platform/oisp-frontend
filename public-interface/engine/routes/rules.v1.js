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

var rules   = require ('../handlers/v1/rules'),
    schemaValidator = require('../../lib/schema-validator'),
    schemas = require('../../lib/schema-validator/schemas'),
    VERSION = '/v1/api',
    PATH    = '/accounts/:accountId/rules';

module.exports = {
    register:  function (app) {
        app.options(VERSION + PATH, rules.usage);
        app.get(VERSION + PATH, rules.getRules);
        app.get(VERSION + '/rules/status/:status', rules.getRulesByStatus);
        app.put(VERSION + PATH + '/draft', schemaValidator.validateSchema(schemas.rule.DRAFT), rules.addRuleAsDraft);
        app.delete(VERSION + PATH + '/draft/:ruleId', schemaValidator.validateSchema(schemas.rule.DELETE_DRAFT), rules.deleteDraft);
        app.get(VERSION + PATH + '/:ruleId', rules.getRule);
        app.delete(VERSION + PATH + '/delete_rule_with_alerts/:ruleId', schemaValidator.validateSchema(schemas.rule.DELETE), rules.deleteRule);
        app.post(VERSION + PATH, schemaValidator.validateSchema(schemas.rule.POST), rules.addRule);
        app.post(VERSION + PATH + '/clone/:ruleId', schemaValidator.validateSchema(schemas.rule.CLONE_RULE), rules.cloneRule);
        app.put(VERSION + PATH + '/:ruleId', schemaValidator.validateSchema(schemas.rule.POST) , rules.updateRule);
        app.put(VERSION + PATH + '/:ruleId/status', schemaValidator.validateSchema(schemas.rule.PUTStatus), rules.updateRuleStatus);
        app.post(VERSION + '/components/rules', schemaValidator.validateSchema(schemas.rule.STATUS), rules.groupByComponentId);
        app.put(VERSION + '/rules/synchronization_status/:statusId', schemaValidator.validateSchema(schemas.rule.PUTSynchronizationStatus), rules.updateRulesSynchronizationStatus);
    }
};
