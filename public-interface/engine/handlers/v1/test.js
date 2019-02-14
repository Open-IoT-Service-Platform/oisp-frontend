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
var users = require('../../api/v1/users'),
    postgresProvider = require('../../../iot-entities/postgresql'),
    userInteractionToken = postgresProvider.userInteractionTokens,
    logger = require('../../../lib/logger/index').init(),
    config = require('../../../config'),
    errBuilder = require('../../../lib/errorHandler/index').errBuilder,
    httpStatuses = require('../../res/httpStatuses'),
    userValidator = require('../../../lib/security/userValidator'),
    recaptcha = require('../../../lib/security/recaptcha');

var isTestAccount = function (email) {
    return recaptcha.checkIfTestEmail(email);
};

var isSecretKeyValid = function (secretKey) {
    if (config.interactionTokenGenerator.permissionKey !== secretKey) {
        return false;
    }

    return true;
};

var isRequestBodyValid = function (req) {
    return (req.body.username && req.body.password && req.body.type && req.body.secretKey && isTestAccount(req.body.username));
};

var getInteractionToken = function(req, res, next) {
    if (!isRequestBodyValid(req) || !isSecretKeyValid(req.body.secretKey)) {
        next(errBuilder.build(errBuilder.Errors.Generic.NotAuthorized));
    } else {
        users.searchUser(req.body.username, function (err, us) {
            if (!us) {
                next(errBuilder.build(errBuilder.Errors.User.NotFound));
            } else {
                userValidator.isPasswordCorrect(req.body.password, us)
                    .then(function passwordVerified() {
                        var data = {
                            userId: us.id,
                            email: us.email,
                            type: req.body.type,
                            expiresAt: new Date((new Date()).getTime() + config.biz.domain.defaultActivateTokenExpiration * 60 * 1000)
                        };
                        userInteractionToken.new(data, function(err, token){
                            if (!err && token) {
                                res.status(httpStatuses.OK.code).send({
                                    interactionToken: token.id
                                });
                            } else {
                                logger.error('Error getting user interaction token: ' + JSON.stringify(err));
                                next(errBuilder.build(errBuilder.Errors.InteractionToken.NotFound));
                            }
                        });
                    }, function passwordInvalid() {
                        logger.warn('passwords matching failed, received pass: ' + req.body.password + ' for username: ' + req.body.username);
                        next(errBuilder.build(errBuilder.Errors.Generic.NotAuthorized));
                    });
            }
        });
    }
};

module.exports = {
    getInteractionToken: getInteractionToken
};