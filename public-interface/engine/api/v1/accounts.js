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
    account = postgresProvider.accounts,
    user = postgresProvider.users,
    logger = require('../../../lib/logger').init(),
    errBuilder  = require("../../../lib/errorHandler").errBuilder,
    uuid = require('uuid'),
    config = require('../../../config'),
    cryptoUtils = require('./../../../lib/cryptoUtils');

var ACCOUNTS = 'accounts';

exports.getActivationCode = function (domId, resultCallback) {
    account.find(domId, function(err, account){
        if (!err && account && account.activation_code && account.activation_code_expire_date) {
            if (account.activation_code_expire_date > Date.now()) {
                logger.info("Activation Code Still active");
                resultCallback(null, {id: account.activation_code, expire: account.activation_code_expire_date});
            } else {
                logger.info("Activation Code Expired, Sending Null");
                resultCallback(null, null);
            }
        } else {
            return resultCallback(errBuilder.build(errBuilder.Errors.Device.ActivationError));
        }
    });
};
var generateGlobalActivationCode = function(accId, resultCallback) {
    account.refreshActivationCode(accId, function(err, account){ // find by public id
        if (!err && account) {
            resultCallback(null, {id: account.activation_code, expire: account.activation_code_expire_date});
        } else {
            logger.error("Not Possible to refresh Auth Code " + JSON.stringify(err));
            resultCallback(errBuilder.build(errBuilder.Errors.Account.SavingError));
        }
    });
};

exports.regenerateActivationCode = generateGlobalActivationCode;

exports.addAccountWithGlobalCode = function (data, userId, resultCallback) {
    var log_prefix = ACCOUNTS + '.addAccountWithGlobalCode,';
    data.public_id = uuid.v4();

    if(!data.healthTimePeriod) {
        data.healthTimePeriod = config.biz.domain.defaultHealthTimePeriod;
    }

    // Default AA values
    if(!data.exec_interval) {
        data.exec_interval = 300;
    }
    if(!data.base_line_exec_interval) {
        data.base_line_exec_interval = 86400;
    }
    if(!data.cd_model_frequency) {
        data.cd_model_frequency = 604800;
    }
    if(!data.cd_execution_frequency) {
        data.cd_execution_frequency = 600;
    }
    if(!data.data_retention) {
        data.data_retention = 0;
    }
    if (data.settings === undefined) {
        data.settings = {
            trackSensorHealth: false
        };
    }

    data.activation_code = cryptoUtils.generate(8);

    //timestamp is in format accepted by postgres
    data.activation_code_expire_date = Math.floor((Date.now() + config.biz.domain.defaultActivateTokenExpiration * 60000) / 1000) * 1000;

    data.created = Math.floor(Date.now() / 1000) * 1000;
    data.updated = data.created;

    return user.accountsCount(userId)
        .then(accountCount => {
            if (accountCount > config.accountsPerUserLimit) {
                throw errBuilder.Errors.Account.MaximumAccountsLimitReached;
            }
            return account.new(data, userId);
        })
        .then(function(userWithNewAccount){
            if (!userWithNewAccount) {
                throw errBuilder.Errors.User.NotFound;
            }
            return data;
        })
        .then(function(account) {
            resultCallback(null, account);
        })
        .catch(function(err) {
            logger.warn(log_prefix + "unable to create account, error:  " + JSON.stringify(err));
            var errMsg = errBuilder.build(errBuilder.Errors.Account.SavingError);
            if (err && err.code) {
                errMsg = errBuilder.build(err);
            }
            resultCallback(errMsg);
        });
};

exports.getAccount = function (accountId, resultCallback) {
    account.find(accountId, function(err, account) {
        if(!err && account){
            resultCallback(err, account);
        } else {
            resultCallback(errBuilder.build(errBuilder.Errors.Account.NotFound));
        }
    });
};

exports.updateAccount = function (requestData, resultCallback) {

    return account.update(requestData)
        .then(function(updatedAccount){
            if (updatedAccount) {
                return updatedAccount;
            } else {
                throw errBuilder.Errors.Account.SavingError;
            }
        })
        .then(function(updatedAccount) {
            resultCallback(null, updatedAccount);
        })
        .catch(function() {
            resultCallback(errBuilder.build(errBuilder.Errors.Account.SavingError));
        });

};

exports.updateAttributes = function (data, resultCallback) {
    var updateModel = {
        public_id: data.public_id,
        as: data.attributes
    };

    exports.updateAccount(updateModel, function (err) {
        if (!err) {
            resultCallback(null);
        } else {
            resultCallback(err);
        }
    });
};

exports.deleteWithoutCommit = function(accountId, transaction) {
    return account.delete(accountId, transaction)
        .then(function(deletedAccountsCount) {
            if (!deletedAccountsCount || deletedAccountsCount < 1) {
                throw errBuilder.Errors.Account.NotFound;
            }
        });
};

exports.delete = function(accountId, resultCallback) {

    return account.delete(accountId)
        .then(function() {
            resultCallback(null);
        })
        .catch (function(err) {
            var errMsg = errBuilder.Errors.Account.DeletionError;
            if(err && err.code) {
                errMsg = err;
            }
            resultCallback(errBuilder.build(errMsg));
        });
};
