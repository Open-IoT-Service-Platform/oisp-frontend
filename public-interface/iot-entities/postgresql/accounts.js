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
    users = require('./models').users,
    interpreterHelper = require('../../lib/interpreter/helper'),
    interpreter = require('../../lib/interpreter/postgresInterpreter').accounts(),
    userInterpreter = require('../../lib/interpreter/postgresInterpreter').users(),
    userModelHelper = require('./helpers/userModelHelper');

/**
 * Create new account for a user. Returns users with all his accounts, including the created one.
 * @param accountData
 * @param userId
 * @param transaction
 * @returns {*}
 */
exports.new = function (accountData, userId, transaction) {

    var accountModel = interpreter.toDb(accountData);

    var newAccount = {
        id: accountModel.id,
        name: accountModel.name,
        settings: accountModel.settings,
        attrs: accountModel.attrs,
        activation_code: accountModel.activation_code,
        activation_code_expire_date: accountModel.activation_code_expire_date
    };

    for(var value in newAccount){
        if(undefined === newAccount[value]){
            newAccount[value] = null;
        }
    }

    return account.create(newAccount, { transaction: transaction })
        .then(acc => {
            return acc.addUsers(userId, {
                through: { role: 'admin' },
                transaction: transaction
            });
        })
        .then(() => {
            return users.findAll({
                where: { id: userId },
                include: [{ model: account }],
                transaction: transaction,
                order: [
                    ['created', 'ASC'],
                    [account, 'created', 'ASC']
                ]
            });
        })
        .then(user => {
            if (!user) {
                throw "User not found";
            }
            var userWithAccounts = userModelHelper.formatUserWithAccounts(user);
            return interpreterHelper.mapAppResults({ dataValues: userWithAccounts }, userInterpreter);
        })
        .catch(err => {
            throw err;
        });
};

exports.update = function (accountData, transaction) {
    var accountModel = interpreter.toDb(accountData);
    var filter = {
        where: {
            id: accountModel.id
        },
        returning: ["*"],
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
    account.findOne({where: {id: id}})
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
        ],
        order: [
            [devices, 'created', 'ASC']
        ]
    };

    return account.findOne(filter)
        .then(function (foundAccount) {
            return interpreterHelper.mapAppResults(foundAccount, interpreter, resultCallback);
        });
};

exports.findByActivationCode = function (activationCode, resultCallback) {
    account.findOne({where: {activation_code: activationCode}})
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
        returning: ["*"]
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
