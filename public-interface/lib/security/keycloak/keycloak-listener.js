/**
 * Copyright (c) 2019 Intel Corporation
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
const express = require('express'),
    user = require('./../../../iot-entities/postgresql').user,
    device = require('./../../../iot-entities/postgresql').device,
    accounts = require('./../../../iot-entities/postgresql').accounts,
    httpStatuses = require('./../../../engine/res/httpStatuses'),
    app = express(),
    PLACEHOLDER = require('./index').placeholder;

app.get('/keycloak/users/:userId/accounts', (req, res) => {
    if (!req.params.userId) {
        return res.status(httpStatuses.OK.code).send([]);
    }
    user.findByIdWithAccountDetails(req.params.userId, (err, result) => {
        if (!err && result) {
            var ret = [];
            Object.keys(result.accounts).forEach(accId => {
                ret.push({
                    id: accId,
                    name: result.accounts[accId].name,
                    role: result.accounts[accId].role
                });
            });
            res.status(httpStatuses.OK.code).send(ret);
        } else {
            // Send empty array for compatibility with keycloak
            res.status(httpStatuses.OK.code).send([]);
        }
    });
});

app.get('/keycloak/activationcode/:activationCode/devices/:deviceUID/account', (req, res) => {
    if (!req.params.activationCode || !req.params.deviceUID) {
        return res.status(httpStatuses.OK.code).send([]);
    }
    device.findByDeviceUIDWithAccountId(req.params.deviceUID).then(d => {
        if (req.params.activationCode === PLACEHOLDER) {
            return res.status(httpStatuses.OK.code).send([{
                id: d.accountId,
                name: "",
                role: 'device'
            }]);
        }
        accounts.findByActivationCode(req.params.activationCode, (err, account) => {
            if (!err && account && d && account.id === d.accountId) {
                return res.status(httpStatuses.OK.code).send([{
                    id: account.id,
                    name: account.name,
                    role: 'device'
                }]);
            } else {
                res.status(httpStatuses.OK.code).send([]);
            }
        });
    }).catch(() => {
        // Send empty array for compatibility with keycloak
        res.status(httpStatuses.OK.code).send([]);
    });
});

module.exports = app;
