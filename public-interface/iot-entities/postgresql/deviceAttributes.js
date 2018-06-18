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

var sequelize = require('./models').sequelize,
    deviceAttributes = require('./models').deviceAttributes;


exports.all = function (accountId, resultCallback) {
    var query = 'SELECT * FROM "dashboard"."deviceAttributesView" where "accountId" = :accountId';
    sequelize.query(query, {model:deviceAttributes, replacements: {accountId: accountId}, type: sequelize.QueryTypes.SELECT})
        .then(function (result) {
            var formattedResult = {};
            if (result && Array.isArray(result)) {
                result.forEach(function(attribute) {
                    formattedResult[attribute.key] = [attribute.value];
                });
            }
            resultCallback(null, formattedResult);
        })
        .catch (function(err) {
            resultCallback(err);
        });
};


