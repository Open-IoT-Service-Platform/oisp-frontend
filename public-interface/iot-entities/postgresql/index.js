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

var sequelize = require('./models').sequelize,
    Sequelize = require('sequelize'),
    super_user_sequelize = require('./models').super_user_sequelize;

var ISOLATION_LEVEL = Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED;

var DAOs = [
    'accounts',
    'componentTypes',
    'complexCommands',
    'invites',
    'settings',
    'users',
    'rules',
    'devices',
    'deviceTags',
    'deviceAttributes',
    'deviceComponents',
    'userInteractionTokens',
    'alerts',
    'actuations',
    'purchasedLimits'
];

DAOs.forEach(function(dao) {
    module.exports[dao] = require(__dirname + '/' + dao);
});

/**
 * Begin transaction, which is returned as a first parameter in promise
 * @returns {*}
 */
exports.startTransaction = function() {
    return sequelize.transaction({isolationLevel: ISOLATION_LEVEL});
};

exports.superUserStartTransaction = function() {
    return super_user_sequelize.transaction({isolationLevel: ISOLATION_LEVEL});
};

exports.rollback = function(t) {
    return t.rollback();
};

exports.commit = function(t) {
    return t.commit();
};
