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
var postgresProvider = require('../../../iot-entities/postgresql'),
    invites = postgresProvider.invites,
    users = postgresProvider.users,
    mailer = require('../../../lib/mailer'),
    errBuilder = require("../../../lib/errorHandler/index").errBuilder,
    logger = require('../../../lib/logger').init(),
    Q = require('q');

exports.getInvites = function (accountId, resultCallback) {
    invites.all(accountId, resultCallback);
};

exports.getUserInvites = function (email, resultCallback) {
    invites.findByEmail(email, resultCallback);
};

exports.getInvite = function (inviteId, resultCallback) {
    return invites.findById(inviteId, null)
        .nodeify(resultCallback);
};

exports.addInvite = function (accountId, host, email, resultCallback) {
    users.find(email, accountId, function (err, usr) {
        if(err){
            resultCallback(errBuilder.build(errBuilder.Errors.Generic.InternalServerError));
            return;
        }

        if (usr) {
            resultCallback(errBuilder.build(errBuilder.Errors.User.AlreadyInvited));
        } else {
            var data = {
                email: email,
                accountId: accountId
            };

            invites.new(accountId, data, function (err, invite) {
                if (!err) {
                    var mail = {
                        subject: 'OISP invitation',
                        host: host,
                        accountName: invite.accountName,
                        email: email
                    };
                    mailer.send('invite-user', mail);
                    resultCallback(null, invite);
                } else {
                    logger.error('invites.addInvite, error: ' + JSON.stringify(err));
                    if (err && err.code) {
                        resultCallback(errBuilder.build(err));
                    } else {
                        resultCallback(errBuilder.build(errBuilder.Errors.Generic.InternalServerError));
                    }
                }
            });
        }
    });
};

exports.delInvite = function (accountId, email, resultCallback) {
    invites.deleteByEmailAndAccount(email, accountId, function (err) {
        if (!err) {
            resultCallback(null, err);
        } else {
            resultCallback(err);
        }
    });
};

var addAccountFromInvitation = function(user, invitation, transaction) {
    var userData = {
        email: invitation.email,
        accounts: {
        }
    };
    userData.accounts[invitation.accountId] = 'user';

    return users.updateByEmail(userData, transaction)
        .then(function (updatedUser) {
            if (!updatedUser) {
                throw errBuilder.Errors.User.NotFound;
            }
            return invites.delete(invitation._id, transaction)
                .catch(function (err) {
                    if (err && err.code) {
                        throw err;
                    }
                    throw errBuilder.Errors.Invite.DeleteError;
                });
        })
        .catch(function (err) {
            if (err && err.code) {
                throw err;
            }
            throw errBuilder.Errors.User.SavingError;
        });
};

var canUserModifyInvitation = function(user, invitation) {
    return (user && user.email === invitation.email);
};

exports.updateInviteStatus = function (inviteId, accept, userId, resultCallback) {
    return postgresProvider.startTransaction()
        .then(function (transaction) {
            return invites.findById(inviteId, transaction)
                .then(function (foundInvite) {
                    if (!foundInvite) {
                        throw errBuilder.Errors.Invite.NotFound;
                    }

                    return users.findById(userId, transaction)
                        .then(function (foundUser) {
                            if (!canUserModifyInvitation(foundUser, foundInvite)) {
                                throw errBuilder.Errors.Generic.NotAuthorized;
                            }
                            if (accept) {
                                return addAccountFromInvitation(foundUser, foundInvite, transaction)
                                    .then(function() {
                                        resultCallback(null, foundInvite);
                                    });
                            } else {
                                return invites.delete(inviteId, transaction)
                                    .then(function() {
                                        resultCallback(null, null);
                                    })
                                    .catch(function () {
                                        throw errBuilder.Errors.Invite.DeleteError;
                                    });
                            }
                    });
                })
                .then(function (invite) {
                    return postgresProvider.commit(transaction)
                        .then(function() {
                            return invite;
                        });
                })
                .catch(function (err) {
                    logger.error('invites.updateInviteStatus error: ' + JSON.stringify(err));
                    return postgresProvider.rollback(transaction)
                        .done(function() {
                            var errMsg = errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
                            if (err && err.code) {
                                errMsg = errBuilder.build(err);
                            }
                            resultCallback(errMsg);
                        });
                });
        });
};
