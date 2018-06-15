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

var users = require('./models').users,
    userAccounts = require('./models').userAccounts,
    accounts = require('./models').accounts,
    sequelize = require('./models').sequelize,
    Q = require('q'),
    helper = require('./helpers/queryHelper'),
    interpreterHelper = require('../../lib/interpreter/helper'),
    interpreter = require('../../lib/interpreter/postgresInterpreter').users(),
    errBuilder  = require("../../lib/errorHandler").errBuilder,
    uuid = require('node-uuid'),
    userModelHelper = require('./helpers/userModelHelper');


exports.TEST_ACCOUNT_PATTERN = '(^test-[0-9]+@(test|example)\\.com$)|(^gateway@intel.com$)';
exports.USER_TYPES = {system: 'system', user: 'user'};

var ADD_USER_QUERY = 'SELECT * from dashboard.create_user(:id, :email, :password, :salt, :termsAndConditions, :verified, :provider, :attrs, :type)';
var UPDATE_USER_QUERY = 'SELECT * from dashboard.update_user(:id, :email, :password, :salt, :termsAndConditions, :verified, :provider, :attrs, :accountId, :role)';

var getReplacementsForQuery = function (userModel, id) {
    var accountId = null;
    var role = null;

    //There should no more than one account in userModel.accounts
    if (userModel.accounts) {
        Object.keys(userModel.accounts).map(function(account) {
            accountId = account;
            if (accountId) {
                role = userModel.accounts[accountId];
            }
        });
    }

    var replaceObject = {
        id: id,
        email: userModel.email,
        password: userModel.password,
        salt: userModel.salt,
        termsAndConditions: userModel.termsAndConditions,
        verified: userModel.verified,
        provider: userModel.provider,
        attrs: JSON.stringify(userModel.attrs),
        accountId: accountId,
        role: role,
        type: userModel.type
    };
    for(var value in replaceObject){
        if (undefined == replaceObject[value]){
            replaceObject[value] = null;
        }
    }
    return replaceObject;
};

exports.new = function (userData, transaction) {
    var userModel = interpreter.toDb(userData);
    var replacements = getReplacementsForQuery(userModel, uuid.v4());

    return sequelize.query(ADD_USER_QUERY,
        {replacements: replacements, transaction: transaction})
            .then(function (result) {
                if (result && result.length > 0 && result[0][0]) {
                    var user = result[0][0];
                    return Q.resolve(interpreterHelper.mapAppResults({dataValues: user}, interpreter));
                } else {
                    throw errBuilder.Errors.User.SavingError;
                }
            })
            .catch(function (err) {
                if (err && err.name === errBuilder.SqlErrors.AlreadyExists) {
                    throw errBuilder.Errors.User.AlreadyExists;
                }
                throw errBuilder.Errors.User.SavingError;
            });
};

exports.all = function (accountId, resultCallback) {
    users.findAll({
        include: [
            {
                model: accounts,
                where: {id: accountId}
            }
        ]})
        .then(function (users) {
            return interpreterHelper.mapAppResults(users, interpreter, resultCallback);
        }).catch(function (err) {
            return resultCallback(err);
        });
};

var getUsersWithAllAccounts = function(users) {
    var result = [];
    if (!users || !Array.isArray(users)) {
        return Q.reject();
    }
    return Q.allSettled(users.map(function(user) {
        return exports.findById(user.dataValues.id)
            .then(function(foundUser) {
                result.push(foundUser);
            });
        }))
        .then(function() {
            return Q.resolve(result);
        });
};

exports.getUsers = function (accountId, queryParameters, resultCallback) {
    helper.parseFilters(queryParameters, users.attributes, function (err, filters) {
        if (err) {
            resultCallback(err);
        } else {
            filters.include = [
                {
                    model: accounts,
                    where: {id: accountId}
                }
            ];
            users.findAll(filters)
                .then(function (users) {
                    return getUsersWithAllAccounts(users)
                        .then(function(usersWithAccount) {
                            return resultCallback(null, usersWithAccount);
                        });
                })
                .catch(function (err) {
                    return resultCallback(err);
                });
        }
    });
};

exports.findById = function (id, transaction) {
    var filter = {
        where: {
            id: id
        },
        include: [
            accounts
        ],
        transaction: transaction
    };

    return users.find(filter)
        .then(function (user) {
            return interpreterHelper.mapAppResults(user, interpreter);
        });
};

exports.findByEmail = function (email, resultCallback) {
    users.find({where: {email: email}, include: [
        accounts
    ]})
    .then(function (user) {
        interpreterHelper.mapAppResults(user, interpreter, resultCallback);
    })
    .catch(function (err) {
        resultCallback(err);
    });
};

exports.find = function (email, accountId, resultCallback) {
    users.find({where: {email: email}, include: [
        {
            model: accounts,
            where: {id: accountId}
        }
    ]})
    .then(function (user) {
        interpreterHelper.mapAppResults(user, interpreter, resultCallback);
    })
    .catch(function (err) {
        resultCallback(err);
    });
};

exports.findByIdWithAccountDetails = function (id, resultCallback) {
    users.find({where: {id: id}, include: [
        accounts
        ]})
        .then(function (user) {
            if (user) {
                return resultCallback(null, interpreter.toApp(user, true));
            }
            return resultCallback(null);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

/**
 * Returns users whose emails match TEST_ACCOUNT_PATTERN
 */
exports.findAllTestUsers = function (resultCallback) {
    sequelize.query('SELECT * FROM "dashboard"."users" WHERE email ~ :emailPattern', users,
        {
            replacements: {
                emailPattern: exports.TEST_ACCOUNT_PATTERN
            },
            type: sequelize.QueryTypes.SELECT
        })
        .then(function(users) {
            interpreterHelper.mapAppResults(users, interpreter, resultCallback);
        })
        .catch(function(err) {
            resultCallback(err);
        });
};

exports.removeAccount = function (userId, accountId, transaction) {
    var filter = {
        where: {
            userId: userId,
            accountId: accountId
        },
        transaction: transaction
    };

    return userAccounts.destroy(filter);
};

var updateUser = function(userData, transaction) {
    var userModel = interpreter.toDb(userData);
    var replacements = getReplacementsForQuery(userModel, userData.id);
    return sequelize.query(UPDATE_USER_QUERY, {replacements: replacements, transaction: transaction})
        .then(function (result) {
            if (result && result.length > 0 && result[0][0]) {
                var userWithAccounts = userModelHelper.formatUserWithAccounts(result[0]);
                return interpreterHelper.mapAppResults({dataValues: userWithAccounts}, interpreter);
            } else {
                return null;
            }
        })
        .catch(function(err) {
            if (err.message === errBuilder.SqlErrors.User.CannotReduceAdminPrivileges) {
                throw errBuilder.Errors.User.CannotReduceAdminPrivileges;
            }
            throw err;
        });
};

exports.update = function (userData, transaction) {
    return updateUser(userData, transaction);

};

exports.updateByEmail = function (userData, transaction) {
    return updateUser(userData, transaction);
};

exports.delete = function (userId, transaction, resultCallback) {
    var filter = {
        where: {
            id: userId
        },
        transaction: transaction
    };
    users.destroy(filter)
        .then(function (res) {
            resultCallback(null, res);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};
