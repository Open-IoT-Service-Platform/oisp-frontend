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

var devices = require('./models').devices,
    deviceTags = require('./models').deviceTags;


exports.all = function (accountId, resultCallback) {
    var filters = {
        where: {
            accountId: accountId
        },
        include: [{ model: deviceTags, as: 'tags'}],
        order: [
            ['created', 'ASC'],
            [{ model: deviceTags, as: 'tags'}, 'created', 'ASC']
        ]
    };

    devices.findAll(filters)
        .then(results => {
            var formattedResult = [];
            results.forEach(device => {
                device.tags.forEach(tag => {
                    formattedResult.push(tag.value);
                });
            });
            resultCallback(null, formattedResult);
        })
        .catch(err => {
            resultCallback(err);
        });
};
