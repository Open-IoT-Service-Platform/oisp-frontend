/**
 * Copyright (c) 2020 Intel Corporation
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

const secConfig = require('./../lib/security/config'),
    postgresProvider = require('../iot-entities/postgresql'),
    accounts = postgresProvider.accounts,
    purchasedLimits = postgresProvider.purchasedLimits;

module.exports = function() {
    if (arguments.length !== 4) {
        console.error("Not enough arguments : ", arguments);
        process.exit(1);
    }

    var accountId = arguments[0];
    var method = arguments[1].toUpperCase();
    var path = arguments[2].toLowerCase();
    var limit = parseInt(arguments[3]);

    if (limit < 0) {
        console.error("Limit cannot be negative");
        process.exit(1);
    }

    if (!secConfig.routes.some(route => route[0] === path && route[1] === method)) {
        console.error("Route cannot be found: ", method, " - ", path);
        process.exit(1);
    }

    accounts.find(accountId, (err) => {
        if (err) {
            console.error("Account cannot be found: ", err);
            process.exit(1);
        }
        return purchasedLimits.setLimitForRoute(accountId, path, method, limit).then(() => {
            console.log("Rate limit set successfully!");
            process.exit(0);
        }).catch(err => {
            console.error("Rate limit could not be set: ", err);
            process.exit(1);
        });
    });
};
