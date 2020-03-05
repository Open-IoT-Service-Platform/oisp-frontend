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
    Op = require('sequelize').Op,
    Q = require('q'),
    interpreterHelper = require('../../lib/interpreter/helper'),
    interpreter = require('../../lib/interpreter/postgresInterpreter').users(),
    errBuilder  = require("../../lib/errorHandler").errBuilder,
    uuid = require('node-uuid'),
    modelsHelper = require('./helpers/modelsHelper'),
    userModelHelper = require('./helpers/userModelHelper');

exports.TEST_ACCOUNT_PATTERN = '(^test-[0-9]+@(test|example)\\.com$)|(^gateway@intel.com$)';
exports.USER_TYPES = {system: 'system', user: 'user'};

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
        attrs: JSON.stringify(userModel.attrs),
        accountId: accountId,
        role: role
    };
    for(var value in replaceObject){
        if (undefined === replaceObject[value]){
            replaceObject[value] = null;
        }
    }
    return replaceObject;
};

exports.new = function (userData, transaction) {
    var userModel = interpreter.toDb(userData);
    userModel = getReplacementsForQuery(userModel, userModel.id ? userModel.id : uuid.v4());
    if (userModel.accountId) {
        delete userModel.accountId;
    }
    if (userModel.role) {
        delete userModel.role;
    }
    return users.create(userModel, { transaction: transaction })
        .then(result => {
            if (result) {
                return Q.resolve(interpreterHelper.mapAppResults(result, interpreter));
            } else {
                throw errBuilder.Errors.Users.SavingError;
            }
        })
        .catch(err => {
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
    var filters = modelsHelper.setQueryParameters(queryParameters, users.attributes, {});
    if (accountId) {
        filters.include = [{
            model: accounts,
            where: {id: accountId}
        }];
    }
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
};

exports.getUsersNotInSet = function(idSet, emailSet) {
    var filters = {
        where: {
            id: {
                [Op.notIn]: idSet ? idSet : []
            },
            email: {
                [Op.notIn]: emailSet ? emailSet : []
            }
        }
    };
    return users.findAll(filters);
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

    return users.findOne(filter)
        .then(function (user) {
            return interpreterHelper.mapAppResults(user, interpreter);
        });
};

exports.findByEmail = function (email, resultCallback) {
    users.findOne({where: {email: email}, include: [
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
    users.findOne({where: {email: email}, include: [
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
    users.findOne({where: {id: id}, include: [ accounts ]})
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
    var accountId = null;
    var role = null;
    var userModel = interpreter.toDb(userData);
    userModel = getReplacementsForQuery(userModel, userData.id);
    if (userModel.accountId) {
        accountId = userModel.accountId;
        delete userModel.accountId;
    }
    if (userModel.role) {
        role = userModel.role;
        delete userModel.role;
    }

    return Q.fcall(() => {
        if (userModel.id) {
            return Q.resolve({ id: userModel.id });
        }
        var filters = {
            where: {
                email: userModel.email
            },
            transaction: transaction
        };
        return users.findOne(filters);
    })
        .then(result => {
            var editableFields = ['attrs'];
            var edited = [];
            editableFields.forEach(field => {
                if (userModel[field]) {
                    edited.push(field);
                }
            });
            userModel.id = result.id;
            return users.update(userModel, {
                fields: edited,
                where: { id: userModel.id }
            });
        })
        .then(() => {
            if (accountId && role) {
                var filters = {
                    where: {
                        userId: userModel.id,
                        accountId: accountId
                    },
                    transaction: transaction
                };
                return userAccounts.findOne(filters).then(result => {
                    if (result && result.role === 'admin' && role !== 'admin') {
                        throw errBuilder.Errors.User.CannotReduceAdminPriviliges;
                    }
                    var userAccount = {
                        role: role,
                        userId: userModel.id,
                        accountId: accountId
                    };
                    return userAccounts.upsert(userAccount, { transaction: transaction });
                });
            }
            return Q.resolve();
        })
        .then(() => {
            var filters = {
                where: {
                    id: userModel.id
                },
                include: [ accounts ],
                transaction: transaction
            };
            return users.findAll(filters);
        })
        .then(result => {
            if (result) {
                var userWithAccounts = userModelHelper.formatUserWithAccounts(result[0]);
                return  interpreterHelper.mapAppResults(userWithAccounts, interpreter);
            } else {
                return null;
            }
        })
        .catch(err => {
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
        transaction: transaction ? transaction : undefined
    };
    return users.destroy(filter)
        .then(res => {
            if (!resultCallback) {
                return res;
            }
            resultCallback(null, res);
        })
        .catch(err => {
            if (!resultCallback) {
                return err;
            }
            resultCallback(err);
        });
};
