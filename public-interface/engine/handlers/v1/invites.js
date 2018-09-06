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

var invites = require('../../api/v1/invites'),
    httpStatuses = require('../../res/httpStatuses'),
    errors = require('../../../lib/errorHandler/index').errBuilder.Errors,
    user = require('../../api/v1/users'),
    errBuilder = require('../../../lib/errorHandler').errBuilder,
    Q = require('q');

exports.usage = function(req, res){
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.status(httpStatuses.OK.code).send();
};

exports.getInvites = function (req, res) {
    if(!req.params || !req.params.accountId){
        return res.status(errors.Generic.InvalidRequest.code).send( errors.Generic.InvalidRequest.message);
    }
    invites.getInvites(req.params.accountId, function(err, invites) {
        if (!err && invites) {
            return res.status(httpStatuses.OK.code).send( invites);
        }
        return res.status(errors.Invite.NotFound.code).send( errors.Invite.NotFound.message);
    });
};

exports.getUserInvites = function (req, res) {
    if(!req.params || !req.params.email || !req.identity){
        return res.status(errors.Generic.InvalidRequest.code).send( errors.Generic.InvalidRequest.message);
    }
    user.getUser(req.identity, function(err, user){
        if (!err && user) {
            if (user.email === req.params.email) {
                invites.getUserInvites(req.params.email, function (err, invites) {
                    if (!err && invites) {
                        return res.status(httpStatuses.OK.code).send( invites);
                    }
                    return res.status(errors.Invite.NotFound.code).send( errors.Invite.NotFound.message);
                });
            } else {
                res.status(errors.Generic.NotAuthorized.code).send(errors.Generic.NotAuthorized.message);
            }
        } else {
            res.status(errors.User.NotFound.code).send( errors.User.NotFound.message);
        }
    });
};

exports.addInvite = function (req, res) {
    var data = req.body;
    if(!data || !data.email || !req.params || !req.params.accountId) {
        res.status(errors.Generic.InvalidRequest.code).send( errors.Generic.InvalidRequest.message);
        return;
    }
    invites.addInvite(req.params.accountId, req.forwardedHeaders.baseUrl, data.email, function(err, inv){
        if (!err) {
            return res.status(httpStatuses.Created.code).send( inv);
        }
        if (res.code && res.status) {
            return res.status(err.code).send( err.status);
        }
        return res.status(errors.Generic.InternalServerError.code).send( errors.Generic.InternalServerError.message);
    });
};

exports.deleteUser = function (req, res, next) {
    var accountId = req.params.accountId,
        email = req.params.email,
        isSelf = false;

    return Q.nfcall(user.getUser, req.identity)
        .then(function(foundUser){
            if(foundUser.email === email || email === 'me') {
                isSelf = true;
                if (email === 'me') {
                    email = foundUser.email;
                }
                return Q.nfcall(user.isUserSoleAdminForAccount, foundUser.id, accountId)
                    .then(function(isUserSoleAdmin){
                        if (isUserSoleAdmin) {
                            throw errBuilder.build(errBuilder.Errors.Account.LeavingError.IsSoleAdminForAccount);
                        }
                    });
            }
            return new Q();
        })
        .then(function(){
            return Q.nfcall(invites.delInvite, accountId, email);
        })
        .then(function(){
            return user.deleteUserFromAccount(email, accountId, isSelf);
        })
        .then(function () {
            res.status(httpStatuses.OK.status).send(httpStatuses.OK.message);
        })
        .catch(function (err) {
            if (err && err.status && err.code) {
                next(err);
            } else {
                next(errBuilder.build(errors.Generic.InternalServerError));
            }
        });
};

exports.updateInviteStatus = function (req, res) {
    var data = req.body;
    if (!data || !req.params || !req.params.inviteId || !req.identity) {
        return res.status(errors.Generic.InvalidRequest.code).send( errors.Generic.InvalidRequest.message);
    }
    
    invites.updateInviteStatus(req.params.inviteId, data.accept, req.identity, function(err, inv) {
    		if (!err) {
        		var resBody = inv;
                if (!inv) {
                    resBody = httpStatuses.DeleteOK;
                }
                res.status(httpStatuses.OK.code).send(resBody);
    		} else {
        		res.status(err.status).send(err.message);
    		}
        });
};
