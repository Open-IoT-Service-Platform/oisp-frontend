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

var cryptoUtils = require('./../../lib/cryptoUtils'),
    config = require('../../config').biz.domain,
    account = require('./models').accounts,
    devices = require('./models').devices,
    interpreterHelper = require('../../lib/interpreter/helper'),
    interpreter = require('../../lib/interpreter/postgresInterpreter').accounts(),
    userInterpreter = require('../../lib/interpreter/postgresInterpreter').users(),
    sequelize = require('./models').sequelize,
    userModelHelper = require('./helpers/userModelHelper');

var ADD_ACCOUNT_QUERY = 'SELECT * from dashboard.create_account(:id, :name, :healthTimePeriod, :exec_interval, ' +
    ':base_line_exec_interval, :cd_model_frequency, :cd_execution_frequency, :data_retention, :activation_code, ' +
    ':activation_code_expire_date, :settings, :attrs, :userId, :role, :created)';

/**
 * Create new account for a user. Returns users with all his accounts, including the created one.
 * @param accountData
 * @param userId
 * @param transaction
 * @returns {*}
 */
exports.new = function (accountData, userId, transaction) {

    var accountModel = interpreter.toDb(accountData);

    var replacements = {
        id: accountModel.id,
        name: accountModel.name,
        healthTimePeriod: accountModel.healthTimePeriod,
        exec_interval: accountModel.exec_interval,
        base_line_exec_interval: accountModel.base_line_exec_interval,
        cd_model_frequency: accountModel.cd_model_frequency,
        cd_execution_frequency: accountModel.cd_execution_frequency,
        data_retention: accountModel.data_retention,
        activation_code: accountModel.activation_code,
        activation_code_expire_date: accountModel.activation_code_expire_date,
        settings: JSON.stringify(accountModel.settings),
        attrs: JSON.stringify(accountModel.attrs),
        userId: userId,
        role: 'admin',
        created: accountData.created
    };

    for(var value in replacements){
        if(undefined == replacements[value]){
            replacements[value] = null;
        }
    }

    return sequelize.query(ADD_ACCOUNT_QUERY, {replacements: replacements, transaction: transaction})
        .then(function (result) {
            if (result && result.length > 0 && result[0][0]) {
                var userWithAccounts = userModelHelper.formatUserWithAccounts(result[0]);
                return interpreterHelper.mapAppResults({dataValues: userWithAccounts}, userInterpreter);
            } else {
                return null;
            }
        });
};

exports.update = function (accountData, transaction) {
    var accountModel = interpreter.toDb(accountData);
    var filter = {
        where: {
            id: accountModel.id
        },
        returning: true,
        transaction: transaction
    };

    return account.update(accountModel, filter)
        .then(function(updatedAccount) {
            if (updatedAccount && updatedAccount.length > 1) {
                return interpreterHelper.mapAppResults(updatedAccount[1][0], interpreter);
            } else {
                return null;
            }
        });
};

exports.delete = function (id, transaction) {
  return account.destroy({where: {id: id}, transaction: transaction});
};

exports.find = function (id, resultCallback) {
    account.find({where: {id: id}})
        .then(function (foundAccount) {
            interpreterHelper.mapAppResults(foundAccount, interpreter, resultCallback);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.findWithDevices = function (id, resultCallback) {
    var filter = {
        where: {
            id: id
        },
        include: [
            devices
        ]
    };

    return account.find(filter)
        .then(function (foundAccount) {
            return interpreterHelper.mapAppResults(foundAccount, interpreter, resultCallback);
        });
};

exports.findByActivationCode = function (activationCode, resultCallback) {
    account.find({where: {activation_code: activationCode}})
        .then(function (foundAccount) {
            interpreterHelper.mapAppResults(foundAccount, interpreter, resultCallback);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.refreshActivationCode = function (id, resultCallback) {

    var filter = {
        where: {
            id: id
        },
        returning: true
    };

    var data = {
        activation_code: cryptoUtils.generate(8),
        activation_code_expire_date: Date.now() + config.defaultActivateTokenExpiration * 60000
    };

    account.update(data, filter)
        .then(function(updatedAccount) {
            if (updatedAccount && updatedAccount.length > 1) {
                interpreterHelper.mapAppResults(updatedAccount[1][0], interpreter, resultCallback);
            } else {
                resultCallback(null);
            }
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

