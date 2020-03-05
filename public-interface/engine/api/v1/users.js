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
    user = postgresProvider.users,
    userInteractionToken = postgresProvider.userInteractionTokens,
    logger = require('../../../lib/logger').init(),
    userSettings = postgresProvider.settings,
    config = require('../../../config'),
    errBuilder = require('../../../lib/errorHandler').errBuilder,
    mailer = require('../../../lib/mailer'),
    entropy = require('../../../lib/entropizer'),
    Q = require('q'),
    userDeleteManager = require('../helpers/userDeleteManager'),
    accountsApi = require('./accounts'),
    keycloak = require('../../../lib/security/keycloak');

exports.getUsers = function (accountId, queryParameters, resultCallback) {
    user.getUsers(accountId, queryParameters, function (err, users) {
        resultCallback(err, users);
    });
};

exports.isUserSoleAdminForAccount = function (userId, accountId, resultCallback) {
    user.all(accountId, function (err, users) {
        if (users) {
            var isOtherAdmin = users.some(function otherAdminThanUser(user) {
                return user.id !== userId && user.accounts[accountId] === 'admin';
            });
            resultCallback(null, !isOtherAdmin);
        } else {
            resultCallback(err, users);
        }
    });
};

exports.getUser = function (userId, resultCallback) {
    user.findByIdWithAccountDetails(userId, function(err, result) {
        if (!err && result) {
            resultCallback(null, result);
        }
        else {
            resultCallback(errBuilder.build(errBuilder.Errors.User.NotFound));
        }
    });
};

exports.searchUser = function (email, resultCallback) {
    user.findByEmail(email, function (err, user) {
        if (!err && user) {
            resultCallback(null, user);
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.User.NotFound));
        }
    });
};

var sendMail = function (options) {
    var data = {
        email: options.email,
        type: options.type,
        expiresAt: new Date((new Date()).getTime() + options.tokenExpiration * 60 * 1000)
    };

    return Q.nfcall(user.findByEmail, data.email)
        .then(function (user) {
            if (!user) {
                throw errBuilder.build(errBuilder.Errors.User.NotFound);
            }
            data.userId = user.id;
            return Q.nfcall(userInteractionToken.new, data)
                .then(function (token) {
                    mailer.send(options.type,
                        {
                            subject: options.subject,
                            email: options.email,
                            token: token.id,
                            host: options.host,
                            path: options.path
                        }
                    );
                    return Q.resolve();
                })
                .catch(function (err) {
                    logger.error('users. sendMail, error: ' + JSON.stringify(err));
                    throw (errBuilder.build(errBuilder.Errors.Generic.InternalServerError));
                });
        });
};

function sendActivationEmail(host, email, resultCallback) {

    if (host && config.verifyUserEmail) {
        var options = {
            subject: 'OISP verification',
            email: email,
            type: userInteractionToken.TYPE.ACTIVATE_USER,
            tokenExpiration: config.biz.domain.defaultActivateTokenExpiration,
            host: host,
            path: config.biz.domain.defaultActivatePath
        };
        sendMail(options)
            .then(function () {
                resultCallback(null);
            }).catch(function(err) {
                resultCallback(err);
            });
    } else {
        resultCallback(null);
    }
}

function addNewUser(data, host) {
    return user.new(data, null)
        .then(function (result) {
            if (!result) {
                throw errBuilder.Errors.Generic.InternalServerError;
            }
            return Q.nfcall(sendActivationEmail, host, data.email)
                .thenResolve(result)
                .catch(function () {
                    throw errBuilder.Errors.User.CannotSendActivationEmail;
                });
        })
        .catch(function (err) {
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            throw errMsg;
        });
}

exports.addUser = function (data, host) {
    if (data.password) {
        if (entropy.check(data.password)) {
            return keycloak.serviceAccount.createUser(data).then(() => {
                return keycloak.serviceAccount.findUserByParameters({ email: data.email });
            }).then(us => {
                delete data.password;
                delete data.verified;
                delete data.termsAndConditions;
                data.id = us.id;
                return addNewUser(data, host);
            });
        } else {
            return Q.reject(errBuilder.build(errBuilder.Errors.User.WeakPassword));
        }
    }
};

exports.updateUser = function (data, accountId) {
    if (!accountId) {    // only allow updating accounts using FULL_PATH
        delete data.accounts;
    }

    if (data.accounts) {
        var newAccounts = {};
        newAccounts[accountId] = data.accounts[accountId].role || data.accounts[accountId];
        data.accounts = newAccounts;
    }
    // user metadata stays same, no need to update keycloak
    return postgresProvider.startTransaction()
        .then(function(transaction) {
            return user.update(data, transaction)
                .then(function(updatedUser) {
                    return postgresProvider.commit(transaction)
                        .then(function() {
                            return Q.resolve(updatedUser);
                        });
                })
                .catch (function(err) {
                    logger.warn("users.update - unable to update user, error: " + JSON.stringify(err));
                    return postgresProvider.rollback(transaction)
                        .done(function() {
                            if (err && err.code) {
                                throw errBuilder.build(err);
                            } else {
                                throw errBuilder.build(errBuilder.Errors.User.SavingError);
                            }
                        });
                });
        });
};

exports.canUserBeDeleted = function (userData) {
    var deferred = Q.defer();
    return userDeleteManager.isUserRemovable(userData)
        .then(function (status) {
            if (status.isRemovable === true) {
                deferred.resolve(status);
                return deferred.promise;
            } else {
                throw errBuilder.build(errBuilder.Errors.User.CannotRemove.IsOnlyAdmin);
            }
        })
        .catch (function (err) {
            if (err && err.code) {
                deferred.reject(err);
            } else {
                deferred.reject(errBuilder.build(errBuilder.Errors.User.NotFound));
            }
            return deferred.promise;
        });
};

var removeUserAccounts = function (accountsToRemove, transaction) {
    return Q.all(accountsToRemove.map(function(accountId) {
        logger.debug('Removing account: ' + accountId);
        return accountsApi.deleteWithoutCommit(accountId, transaction);
    }));
};

var deleteUserAccounts = function(userId, transaction) {
    return Q.nfcall(exports.getUser, userId)
        .then (function userFound(user) {
            return exports.canUserBeDeleted(user)
                .then(function canBeDeleted(status) {
                    var accountsToRemove = status.removableAccounts;
                    return removeUserAccounts(accountsToRemove, transaction);
                })
                .catch(function(err) {
                    //Ignore errors during accounts removal
                    logger.warn("The user " + userId + " could not be deleted. Error: " + err);
                })
                .thenResolve(user);
        });
};

exports.deleteUser = function (userId) {
    var transaction;
    // always delete from own database first to avoid
    // conflict with oisp event listener in keycloak
    return postgresProvider.startTransaction().then(t => {
        transaction = t;
        return deleteUserAccounts(userId, transaction);
    }).then(function () {
        return Q.nfcall(user.delete, userId, transaction);
    }).then(function() {
        return postgresProvider.commit(transaction);
    }).then(() => {
        return keycloak.serviceAccount.deleteUser(userId);
    }).catch (function (err) {
        return postgresProvider.rollback(transaction).done(function() {
            if (err && err.code) {
                logger.error("Could not delete user: " + userId);
                throw err;
            } else {
                throw errBuilder.build(errBuilder.Errors.User.NotFound);
            }
        });
    });
};

exports.deleteUserFromAccount = function (email, accountId, isSelf) {

    return Q.nfcall(user.findByEmail, email)
        .then(function (foundUser) {
            if (!foundUser) {
                throw errBuilder.build(errBuilder.Errors.User.NotFound);
            }
            if (!foundUser.accounts || !foundUser.accounts[accountId]) {
                return Q.resolve();
            } else {
                if (!isSelf && foundUser.accounts[accountId] === 'admin') {
                    throw errBuilder.build(errBuilder.Errors.Generic.NotAuthorized);
                }
                delete foundUser.accounts[accountId];
                return postgresProvider.startTransaction()
                    .then(function (transaction) {
                        return user.removeAccount(foundUser.id, accountId, transaction)
                            .then(function () {
                                return userSettings.deleteAccounts(foundUser.id, accountId, transaction);
                            })
                            .then(function () {
                                return postgresProvider.commit(transaction);
                            })
                            .catch(function () {
                                return postgresProvider.rollback(transaction)
                                    .done(function(err) {
                                        throw err;
                                    });
                            });
                    });
            }
        });
};

exports.addPasswordToken = function (email, host, resultCallback) {
    user.findByEmail(email, function (err, user) {
        if (user) {
            var options = {
                subject: 'OISP recover password - Intel(r) Corporation',
                email: email,
                type: userInteractionToken.TYPE.PASSWORD_RESET,
                tokenExpiration: config.biz.domain.defaultPasswordTokenExpiration,
                host: host,
                path: config.biz.domain.defaultPasswordResetPath
            };
            sendMail(options)
                .then(function () {
                    resultCallback(null);
                }).catch(function(err) {
                    resultCallback(err);
                });
        } else {
            logger.error('users.addPasswordToken - User not found: ' + JSON.stringify(err));
            resultCallback(null);
        }
    });
};

exports.getPasswordToken = function (tokenId, resultCallback) {
    userInteractionToken.findByUserInteractionTokenId(tokenId, function (err, token) {
        if (!err && token) {
            resultCallback(null, token);
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
        }
    });
};

exports.changePasswordOfUser = function (email, userIdentifier, data, resultCallback) {
    if (entropy.check(data.password)) {
        keycloak.adapter.grantManager.obtainDirectly(email, data.currentpwd)
            .then(() => {
                return user.findByEmail(email, function(err, usr) {
                    return keycloak.serviceAccount.changeUserPassword(usr.id, data.password)
                        .then(() => {
                            resultCallback(null);
                        }).catch(() => {
                            resultCallback(errBuilder.build(errBuilder.Errors.User.SavingError));
                        });
                });
            }).catch(() => {
                resultCallback(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
            });
    } else {
        resultCallback(errBuilder.build(2401));
    }
};

exports.changePassword = function (data, resultCallback) {
    if (entropy.check(data.password)) {
        return Q.nfcall(userInteractionToken.findByUserInteractionTokenId, data.token)
            .then(function (token) {
                if (!token) {
                    throw errBuilder.Errors.User.InvalidInteractionToken;
                }
                return keycloak.serviceAccount.changeUserPassword(token.userId, data.password)
                    .then(function() {
                        userInteractionToken.deleteByUserIdAndType(token.userId, userInteractionToken.TYPE.PASSWORD_RESET);
                    })
                    .catch(function () {
                        throw errBuilder.Errors.User.SavingError;
                    });
            })
            .then(function () {
                resultCallback(null);
            })
            .catch(function (err) {
                var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
                if (err && err.code) {
                    errMsg = errBuilder.build(err);
                }
                resultCallback(errMsg);
            });
    } else {
        resultCallback(errBuilder.build(errBuilder.Errors.User.WeakPassword));
    }
};

exports.getUserSettings = function (userId, accountId, category, resultCallback) {
    userSettings.findByCategory(userId, accountId, category, function (err, result) {
        if (!err && result) {
            resultCallback(null, result);
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.User.Setting.NotFound));
        }
    });
};

exports.getUserSetting = function (userId, accountId, category, settingId, resultCallback) {
    userSettings.findById(userId, accountId, category, settingId, function (err, result) {
        if (!err && result) {
            resultCallback(null, result);
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.User.Setting.NotFound));
        }
    });
};

var resetDefaultSettings = function (userId, accountId, category, setting) {

    if (category === 'favorite') {
        if (setting.default === true) {
            return Q.nfcall(userSettings.findByCategory, userId, accountId, category)
                .then(function (allSettings) {
                    if (allSettings) {
                        return Q.all(allSettings.map(function (item) {
                            item.default = false;
                            return Q.nfcall(userSettings.update, item.id, item);
                        }));
                    }
                });
        }
    }
    return new Q();
};

exports.addUserSettings = function (userId, accountId, category, setting, resultCallback) {
    setting.userId = userId;
    setting.domainId = accountId;
    setting.category = category;


    return resetDefaultSettings(userId, accountId, category, setting)
        .then (function() {
            return Q.nfcall(userSettings.new, setting)
                .then (function(result) {
                    resultCallback(null, result);
                });

        })
        .catch(function(err) {
            logger.error('addUserSettings - error during adding new setting: ' + JSON.stringify(err));
            resultCallback(errBuilder.build(errBuilder.Errors.User.Setting.SavingError));
        });
};

exports.updateUserSettings = function (userId, accountId, category, settingId, setting, resultCallback) {

    return Q.nfcall(userSettings.findById, userId, accountId, category, settingId)
        .then (function(currentSetting) {
            setting.userId = currentSetting.userId;
            setting.domainId = accountId;
            setting.category = currentSetting.category;
            return resetDefaultSettings(userId, accountId, category, setting)
                .then (function() {
                    return Q.nfcall(userSettings.update, settingId, setting)
                        .then (function(result) {
                            resultCallback(null, result);
                        });
                });
        })
        .catch(function (err) {
            logger.error('addUserSettings - error during updating setting: ' + JSON.stringify(err));
            resultCallback(errBuilder.build(errBuilder.Errors.User.Setting.SavingError));
        });
};

exports.deleteUserSettings = function (userId, accountId, category, settingId, resultCallback) {
    userSettings.delete(settingId, function (err) {
        if (!err) {
            resultCallback(null);
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.User.Setting.NotFound));
        }
    });
};

exports.activate = function (options, callback) {
    return Q.nfcall(userInteractionToken.findByUserInteractionTokenId, options.tokenId)
        .then(function (token) {
            if (!token) {
                throw errBuilder.Errors.User.Activation.TokenError;
            }
            var userData = {
                verified: true,
            };

            return keycloak.serviceAccount.updateUserById(token.userId, userData)
                .then(function() {
                    return Q.nfcall(userInteractionToken.deleteByUserIdAndType, token.userId, userInteractionToken.TYPE.ACTIVATE_USER)
                        .catch(function (err) {
                            logger.error('users. activate, could not remove interaction token, error: ' + JSON.stringify(err));
                        });
                }).catch(function() {
                    throw errBuilder.Errors.User.Activation.CannotUpdate;
                });
        })
        .then(function () {
            callback(null);
        })
        .catch(function (err) {
            logger.error('users.activate, could not activate user, error: ' + JSON.stringify(err));
            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            callback(errMsg);
        });
};

exports.reactivate = function (options, callback) {
    if (options.host !== undefined && options.email !== undefined) {
        sendActivationEmail(options.host, options.email, function (errr, result) {
            if (!errr) {
                callback(errr, result);
            } else {
                callback(errBuilder.build(errBuilder.Errors.User.CannotSendActivationEmail));
            }
        });
    } else {
        callback(errBuilder.build(errBuilder.Errors.User.NotFound));
    }

};
