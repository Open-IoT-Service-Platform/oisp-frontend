/**
 * Copyright (c) 2015 Intel Corporation
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

var postgresProvider = require('../../iot-entities/postgresql'),
    user = postgresProvider.users,
    logger = require('../logger').init(),
    errBuilder = require('../errorHandler').errBuilder,
    entropy = require('../entropizer'),
    gatewayUser = require('../../config').auth.gatewayUser,
    ruleEngineUser = require('../../config').auth.ruleEngineUser,
    Q = require('q'),
    keycloak = require('../security/keycloak');

function addUser(data) {
    if (!entropy.check(data.password)) {
        return Q.reject(errBuilder.build(errBuilder.Errors.User.WeakPassword));
    }
    return keycloak.serviceAccount.createUser(data).then(() => {
        return keycloak.serviceAccount.findUserByParameters({ email: data.email });
    }).then(us => {
        data.id = us.id;
        return user.new(data, null);
    }).then(result => {
        if (!result) {
            throw errBuilder.Errors.User.SavingError;
        }
        logger.info("System user - " + data.email +  " created.");
        return result;
    });
}

exports.create = function(){
    var dataUser = [
        {
            password: gatewayUser.password,
            email: gatewayUser.email
        },
        {
            password: ruleEngineUser.password,
            email: ruleEngineUser.email
        }
    ];

    dataUser.forEach(function(userData) {
        userData.termsAndConditions = true;
        userData.verified = true;
        userData.roles = [user.USER_TYPES.system];
    });

    return Q.all(dataUser.map(function(systemUser) {
        return Q.nfcall(user.findByEmail, systemUser.email)
            .then(function (user) {
                if (!user) {
                    return addUser(systemUser);
                } else {
                    logger.info("System user - " + systemUser.email + " already exists");
                }
            });
    }));
};
