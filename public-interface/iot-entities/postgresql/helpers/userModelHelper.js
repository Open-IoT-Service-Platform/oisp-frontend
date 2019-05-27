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

var helper = require('./helper');

exports.formatUserWithAccounts = function(userWithAccounts) {

    var accountsParser = function (row, accounts) {
        if (row.accountId) {
            accounts[row.accountId] = {
                id: row.accountId,
                dataValues: {
                    user_accounts: {
                        role: row.role
                    }
                }
            };
        }
    };

    var result = null;
    if (userWithAccounts) {
        result = userWithAccounts;
        result.accounts = helper.parseCollection(userWithAccounts.accounts, accountsParser);
        delete result.accountId;
        delete result.role;
    }
    return result;
};
