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
    users = require('./../../../iot-entities/postgresql').users,
    devices = require('./../../../iot-entities/postgresql').devices,
    accounts = require('./../../../iot-entities/postgresql').accounts,
    httpStatuses = require('./../../../engine/res/httpStatuses'),
    app = express(),
    kcConfig = require('./config').getKeycloakConfig(),
    utils = require('./../utils'),
    errBuilder = require('./../../errorHandler').errBuilder,
    notAuthorizedCode = errBuilder.Errors.Generic.NotAuthorized.code,
    notAuthorizedMessage = errBuilder.Errors.Generic.NotAuthorized.message;

function checkSecret(req, res, next) {
    var secret = utils.getBasicToken(req.headers.authorization);
    if (!secret || secret !== kcConfig.credentials.secret) {
        return res.status(notAuthorizedCode).send(notAuthorizedMessage);
    }
    return next();
}

app.use('/', checkSecret);

app.get('/keycloak/users/:userId/accounts', (req, res) => {
    if (!req.params.userId) {
        return res.status(httpStatuses.OK.code).send([]);
    }
    users.findByIdWithAccountDetails(req.params.userId, (err, result) => {
        if (!err && result) {
            var ret = [];
            Object.keys(result.accounts).forEach(accId => {
                ret.push({
                    id: accId,
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
    devices.findByDeviceUIDWithAccountId(req.params.deviceUID).then(d => {
        if (req.params.activationCode === kcConfig.placeholder) {
            return res.status(httpStatuses.OK.code).send([{
                id: d.accountId,
                role: 'device'
            }]);
        }
        accounts.findByActivationCode(req.params.activationCode, (err, account) => {
            if (!err && account && d && account.public_id === d.accountId) {
                return res.status(httpStatuses.OK.code).send([{
                    id: account.public_id,
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

app.delete('/keycloak/users/:userId', (req, res) => {
    if (!req.params.userId) {
        return res.status(httpStatuses.BadRequest.code).send();
    }
    return users.delete(req.params.userId).then(() => {
        return res.status(httpStatuses.DeleteOK.code).send();
    }).catch(err => {
        return res.status(httpStatuses.BadRequest.code).send(err);
    });
});

module.exports = app;
