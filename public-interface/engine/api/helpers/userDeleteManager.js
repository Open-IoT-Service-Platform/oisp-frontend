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

var logger = require('../../../lib/logger').init(),
    users = require('../v1/users'),
    Q = require('q');

var hasAccountOnlyOneUser = function (userId, accountId) {
    var deferred = Q.defer();
    return Q.nfcall(users.getUsers, accountId, {})
        .then(function (accountUsers) {
            if (accountUsers) {
                var isOtherUser = accountUsers.some(function otherUser(user) {
                    return user.id !== userId;
                });
                if (isOtherUser) {
                    deferred.reject();
                } else {
                    deferred.resolve();
                }
            } else {
                throw new Error('No users found for account - ' + accountId);
            }
            return deferred.promise;
        });
};

var isAccountRemovable = function (userId, account) {
    return Q.nfcall(users.isUserSoleAdminForAccount, userId, account)
        .then(function () {
            return hasAccountOnlyOneUser(userId, account);
        });
};

var getUsersAccountsStatus = function (userData) {
    var accountsWhichCannotBeRemove = [];
    var accountWhichCanBeRemove = [];

    var accountsIds = [];
    if (userData.accounts) {
        accountsIds = Object.keys(userData.accounts);
    }
    var tasksForCheckAccountStatus = accountsIds.map(function (acc) {
        return isAccountRemovable(userData.id, acc)
            .then(function removable() {
                accountWhichCanBeRemove.push(acc);
            }, function irremovable(err) {
                if (err) {
                    throw new Error(err);
                }
                logger.info('Account cannot be remove: ' + acc);
                accountsWhichCannotBeRemove.push(acc);
            });
    });
    var deferred = Q.defer();
    return Q.all(tasksForCheckAccountStatus)
        .then(function () {
            var response = {
                irremovableAccounts: accountsWhichCannotBeRemove,
                removableAccounts: accountWhichCanBeRemove
            };
            deferred.resolve(response);
            return deferred.promise;
        });
};

var isResultSuccess = function (result) {
    return (result === true);
};

var canLeaveAllAccounts = function (userId, accounts) {
    var deferred = Q.defer();
    var tasksForCheckOtherAdmins = accounts.map(function (acc) {
        return Q.nfcall(users.isUserSoleAdminForAccount, userId, acc);
    });
    return Q.all(tasksForCheckOtherAdmins)
        .then(function (results) {
            for (var i = 0; i < results.length; i++) {
                if (isResultSuccess(results[i])) {
                    deferred.reject();
                    return deferred.promise;
                }
            }
            deferred.resolve();
            return deferred.promise;
        });
};

var isAllUserAccountsRemovable = function (status) {
    if (status.irremovableAccounts) {
        return status.irremovableAccounts.length === 0;
    }
    return false;
};

var getUsersSuccessStatus = function (removableAccounts) {
    return {
        isRemovable: true,
        removableAccounts: removableAccounts
    };
};

var getUsersRejectedStatus = function () {
    return {
        isRemovable: false
    };
};

var isUserRemovable = function (userData) {
    var deferred = Q.defer();

    return getUsersAccountsStatus(userData)
        .then(function statusResolved(status) {
            if (isAllUserAccountsRemovable(status)) {
                deferred.resolve(getUsersSuccessStatus(status.removableAccounts));
                return deferred.promise;
            } else {
                return canLeaveAllAccounts(userData.id, status.irremovableAccounts)
                    .then(function canLeave() {
                        logger.info('User - ' + userData.id + ' can be removed with some of his accounts');
                        deferred.resolve(getUsersSuccessStatus(status.removableAccounts));
                        return deferred.promise;
                    }, function cannotLeave () {
                        deferred.resolve(getUsersRejectedStatus());
                        return deferred.promise;
                    });
            }
        });
};

module.exports = {
    isUserRemovable: isUserRemovable
};