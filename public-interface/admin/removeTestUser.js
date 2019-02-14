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

/**
 * In order to call removeTestUser script use following command: node ../admin/index.js removeTestUser
 */
var postgresProvider = require('../iot-entities/postgresql'),
    user = postgresProvider.users,
    logger = require('../lib/logger').init(),
    async = require('async'),
    users = require('../engine/api/v1/users'),
    account = require('../engine/api/v1/accounts');

/**
 * 48 hours from current date in milliseconds
 * @type {number}
 */
var startFromDate = Date.now();

var getTestUsers = function(resultCallback) {
    user.findAllTestUsers(function(err, users) {
        if(!err && users) {
            users.forEach(function (u) {
                if(u.password) {
                    delete(u.salt);
                    delete(u.password);
                }
            });
        }
        resultCallback(err, users);
    }, startFromDate);
};

var removeAccount = function(accountId, resultCallback) {
    logger.info('Removing account: ' + accountId);
    account.delete(accountId, function(err) {
        if(!err) {
            logger.info(accountId + ' removed');
            resultCallback();
        } else {
            logger.error('Unable to remove account - ' + accountId + ' - ' + err );
            resultCallback(null, err);
        }
    });
};

var removeAccounts = function(accounts, resultCallback) {
    async.series(accounts.map(function(id){
        return function(parallelCallback) {
            removeAccount(id, parallelCallback);
        };
    }), function(err) {
        resultCallback(err);
    });
};

var removeUser = function(userData, resultCallback) {
    logger.info('Removing user: ' + userData.email);
    users.deleteUser(userData.id).then (function userDeleted() {
        logger.info(userData.email + ' removed');
        resultCallback();
    }, function userDeleteError(err) {
        logger.error('Unable to remove user - ' + userData.email + ' - ' + err );
        resultCallback(null, err);
    });
};

module.exports = function() {
    this.remove = function() {
        logger.info('Removing test\'s users start.');
        getTestUsers(function(err, result) {
            if(!err) {
                var usersToRemove = result;
                if(!usersToRemove || usersToRemove.length === 0) {
                    logger.info('No test\'s users found in DB.');
                    process.exit(1);
                } else {
                    async.series(usersToRemove.map(function (user) {
                        return function (parallelCallback) {
                            if (user.accounts) {
                                removeAccounts(Object.keys(user.accounts), function (err, resultsWithError) {
                                    //Errors are put into resultsWithError array in order to do not break next async calls
                                    if (!resultsWithError) {
                                        removeUser(user, parallelCallback);
                                    } else {
                                        logger.info('Unable to remove user accounts, - ' + user.email + ' will not be removed');
                                        parallelCallback();
                                    }
                                });
                            } else {
                                logger.info('No accounts found for user - ' + user.email);
                                removeUser(user, parallelCallback);
                            }
                        };
                    }), function () {
                        logger.info('Done.');
                        process.exit(1);
                    });
                }
            } else{
                logger.error('Unable to get list of test\'s users from DB - ' + err);
                process.exit(1);
            }
        });
    };
};
