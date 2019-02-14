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

var redisProvider = require('../../iot-entities/redis').InitProvider(),
    userLocks = redisProvider.UserLocks,
    config = require('../../config'),
    logger = require('./../logger').init(),
    errBuilder = require('./../errorHandler').errBuilder,
    Q = require('q');

var maxUnsuccessfulLoginAttempts = config.login.maxUnsuccessfulAttempts;

/**
 * Lock period length in milliseconds
 * @type {Number}
 */
var lockIntervalLength = config.login.lockIntervalLength * 1000;

var userLockedMsg = function () {
    return errBuilder.build(errBuilder.Errors.User.AccountLocked);
};

var increaseLoginLockPeriod = function (email, period, loginFails) {
    return Q.Promise(function (resolve, reject) {
        userLocks.increaseLoginLockPeriod(email, period, loginFails, maxUnsuccessfulLoginAttempts,
            function increaseResult(err) {
                if (!err) {
                    resolve();
                } else {
                    reject(err || 'Error during modify login lock period');
                }
            });
    });
};

var removeLockForUser = function (email) {
    return Q.nfcall(userLocks.deleteByEmail, email)
        .then(function () {
            logger.debug("User lock removed for: " + email);
        });
};

var isUserLocked = function (email) {
    return Q.Promise(function (resolve, reject) {
        userLocks.getLoginLockPeriod(email, function (err, ttl) {
            logger.debug("User lock ttl is: " + ttl);
            if (ttl < 0) {
                reject();
            } else {
                resolve(ttl);
            }
        });

    });
};

/**
 * Increments counter of failed login attempts. In case when counter exceed the limit of login failed attempts also
 * increase the lock period (time in which user cannot login).
 * @param email
 */
var incrementLoginFailedCount = function (email) {
    return Q.nfcall(userLocks.incrementLoginFailedCounter, email).
        then(function success(loginFails) {
            logger.debug("User lock fails: " + loginFails);
            if (loginFails >= maxUnsuccessfulLoginAttempts) {
                return increaseLoginLockPeriod(email, lockIntervalLength, loginFails);
            }
        });
};

module.exports = {
    isUserLocked: isUserLocked,
    removeLockForUser: removeLockForUser,
    incrementLoginFailedCount: incrementLoginFailedCount,
    userLockedMsg: userLockedMsg
};

