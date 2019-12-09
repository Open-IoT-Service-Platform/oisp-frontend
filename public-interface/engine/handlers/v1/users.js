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
    Response = require('../../../lib/response').response,
    errBuilder = require("../../../lib/errorHandler/index").errBuilder,
    httpStatuses = require('../../res/httpStatuses'),
    attributesValidation = require('../helpers/attributesValidation'),
    Q = require('q');


function isMe(req) {
    return req.params.userId === 'me';
}

function getUserId(req) {
    return isMe(req) ? req.identity : req.params.userId;
}

function getUserIdAsInt(req) {
    return isMe(req) ? req.identity : parseInt(req.params.userId);
}

exports.usage = function (req, res) {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.status(httpStatuses.OK.code).send();
};

exports.getUsers = function (req, res, next) {
    if (!req.params.accountId) {
        next(errBuilder.build(errBuilder.Errors.Generic.NotAuthorized));
    }
    var queryParameters = req.query;
    users.getUsers(req.params.accountId, queryParameters, function (err, users) {
        if (!err) {
            res.status(httpStatuses.OK.code).send(users);
        } else {
            next(err);
        }
    });
};

exports.getUser = function (req, res, next) {
    if (!req.params.userId) {
        next(errBuilder.build(errBuilder.Errors.User.InvalidData));
    }

    if (req.params.userId !== req.identity) {
        var responder = new Response(res, next);
        responder(errBuilder.Errors.Generic.NotAuthorized);
    }

    users.getUser(req.params.userId, function(err, user){
        if(!err && user){
            res.status(httpStatuses.OK.code).send(user);
        }else{
            next(err);
        }
    });
};

exports.addUser = function (req, res, next) {
    var data = req.body;
    delete data.accounts;

    if (!data) {
        next(errBuilder.build(errBuilder.Errors.User.InvalidData));
        return;
    }
    return Q.nfcall(attributesValidation.checkLimitsForAttributes, data.attributes)
        .then(function () {
            return users.addUser(data, req.forwardedHeaders.baseUrl)
                .then( function (result) {
                    res.status(httpStatuses.Created.code).send( result);
                })
                .catch(function (err) {
                    next(err);
                });
        })
        .catch(function (err) {
            var responder = new Response(res, next);
            responder(httpStatuses.BadRequest.code, err);
        });
};

exports.updateUserAttributesOrTaC = function (req, res, next) {
    var responder = new Response(res, next);
    var body = req.body;
    var data = {
        id: getUserId(req)
    };

    if (body.id && body.id !== data.id) {
        responder(errBuilder.Errors.Generic.InvalidRequest);
    }
    else {
        if (data.id === req.identity) {
            if (body.attributes) {
                data.attributes = body.attributes;
            }
            if (body.termsAndConditions) {
                data.termsAndConditions = body.termsAndConditions;
            }
            attributesValidation.checkLimitsForAttributes(data.attributes, function (err) {
                if (!err) {
                    users.updateUser(data, null)
                        .then(function () {
                            res.status(httpStatuses.OK.code).send();
                        })
                        .catch(function (err) {
                            next(err);
                        });
                } else {
                    responder(httpStatuses.BadRequest.code, err);
                }
            });
        } else {
            responder(errBuilder.Errors.Generic.NotAuthorized);
        }
    }
};

exports.updateUserRoleForYourAccount = function (req, res, next) {
    var body = req.body;
    var data = {
        id: getUserId(req)
    };

    if ((body.accounts && body.accounts[req.params.accountId])) {
        data.accounts = body.accounts;
        users.updateUser(data, req.params.accountId).then(function () {
            res.status(httpStatuses.OK.code).send();
        }).catch(function (err) {
            next(err);
        });
    } else {
        var responder = new Response(res, next);
        responder(errBuilder.Errors.Generic.NotAuthorized);
    }
};

exports.deleteUser = function (req, res, next) {
    if (!req.params.userId) {
        next(errBuilder.build(errBuilder.Errors.User.InvalidData));
    }
    var userId = getUserId(req);
    if (userId === req.identity) {
        return users.deleteUser(userId)
            .then(function userDeleted() {
                res.status(httpStatuses.DeleteOK.code).send();
            })
            .catch(function (err) {
                next(err);
            });
    } else {
        var responder = new Response(res, next);
        responder(errBuilder.Errors.Generic.NotAuthorized);
    }
};

exports.changePasswordWithCurrentPwd = function (req, res, next) {
    var data = req.body;
    if (!data.currentpwd || !data.password) {
        next(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
        return;
    }
    users.changePasswordOfUser(req.params.email, req.identity, data, function (err) {
        if (err) {
            next(err);
        } else {
            res.status(httpStatuses.OK.code).send(data);
        }
    });
};

function requestHasParams(req, requiredParams) {
    var hasAllRequiredParams = true;
    requiredParams.forEach(function (reqParam) {
        if (!req.params.hasOwnProperty(reqParam)) {
            hasAllRequiredParams = false;
        }
    });
    return hasAllRequiredParams;
}

exports.getUserSetting = function (req, res, next) {
    if (!requestHasParams(req, ['category', 'userId', 'settingId']) || !isMe(req)) {
        next(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
        return;
    }
    var userId = getUserIdAsInt(req);

    users.getUserSetting(userId, req.params.accountId, req.params.category, req.params.settingId, function (err, setting) {
        if (err) {
            next(err);
        } else {
            res.status(httpStatuses.OK.code).send(setting);
        }
    });
};

exports.getUserSettings = function (req, res, next) {
    if (!requestHasParams(req, ['category', 'userId']) || !isMe(req)) {
        next(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
        return;
    }
    var userId = getUserIdAsInt(req);

    users.getUserSettings(userId, req.params.accountId, req.params.category, function (err, settings) {
        if (err) {
            next(err);
        } else {
            res.status(httpStatuses.OK.code).send(settings);
        }
    });
};

exports.addUserSettings = function (req, res, next) {
    if (!requestHasParams(req, ['category', 'userId']) || !isMe(req) || !req.body) {
        next(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
        return;
    }
    var userId = getUserIdAsInt(req);

    users.addUserSettings(userId, req.params.accountId, req.params.category, req.body, function (err, setting) {
        if (err) {
            next(err);
        } else {
            res.status(httpStatuses.OK.code).send(setting);
        }
    });
};

exports.updateUserSettings = function (req, res, next) {
    if (!requestHasParams(req, ['category', 'userId', 'settingId']) || !isMe(req) || !req.body) {
        next(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
        return;
    }
    var userId = getUserIdAsInt(req);

    users.updateUserSettings(userId, req.params.accountId, req.params.category, req.params.settingId, req.body, function (err) {
        if (err) {
            next(err);
        } else {
            res.status(httpStatuses.OK.code).send();
        }
    });
};

exports.deleteUserSettings = function (req, res, next) {
    if (!requestHasParams(req, ['category', 'userId', 'settingId']) || !isMe(req)) {
        next(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
        return;
    }
    var userId = getUserIdAsInt(req);

    users.deleteUserSettings(userId, req.params.accountId, req.params.category, req.params.settingId, function (err) {
        if (err) {
            next(err);
        } else {
            res.status(httpStatuses.DeleteOK.code).send();
        }
    });
};

exports.addPasswordToken = function (req, res, next) {
    if(!req.body || !req.body.email || !req.forwardedHeaders){
        next(errBuilder.build(errBuilder.Errors.User.InvalidData));
        return;
    }
    users.addPasswordToken(req.body.email, req.forwardedHeaders.baseUrl, function(err, data){
        if(err){
            next(err);
        } else {
            res.status(httpStatuses.OK.code).send(data);
        }
    });
};

exports.getPasswordToken = function (req, res, next) {
    if(!req.query.token){
        next(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
        return;
    }
    users.getPasswordToken(req.query.token, function(err, data){
        if(err){
            next(err);
        } else {
            res.status(httpStatuses.OK.code).send(data);
        }
    });
};

exports.changePassword = function(req, res, next){
    var data = req.body;
    if(!data.token || !data.password){
        next(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
        return;
    }
    users.changePassword(data, function(err){
        if(err){
            next(err);
        } else {
            res.status(httpStatuses.OK.code).send();
        }
    });
};

exports.activate = function(req, res, next){
    var options = {
        tokenId: req.body.token
    };

    users.activate(options, function(err){
        if (err) {
            next(err);
        } else {
            res.status(httpStatuses.OK.code).send();
        }
    });
};

exports.reactivate = function(req, res, next){
    var options = {
        email: req.body.email,
        host: req.forwardedHeaders.baseUrl
    };
    users.reactivate(options, function(err){
        if (err) {
            next(err);
        } else {
            res.status(httpStatuses.OK.code).send();
        }
    });
};
