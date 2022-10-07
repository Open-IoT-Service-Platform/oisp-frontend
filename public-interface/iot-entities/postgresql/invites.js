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

var invites = require('./models').invites,
    accounts = require('./models').accounts,
    errBuilder  = require("../../lib/errorHandler").errBuilder,
    interpreterHelper = require('../../lib/interpreter/helper'),
    interpreter = require('../../lib/interpreter/postgresInterpreter').invites();

exports.all = function (accountId, resultCallback) {
    invites.findAll({
        where: {
            accountId: accountId
        },
        order: [
            ['created', 'ASC']
        ]
    }).then(function (invites) {
        if (invites) {
            resultCallback(null, invites.map(function(invite) {
                return invite.email;
            }));
        } else {
            resultCallback(null);
        }
    }).catch(function (err) {
        resultCallback(err);
    });
};

exports.findByEmail = function (email, resultCallback) {
    var filter = {
        where: {
            email: email
        },
        include: [accounts],
        order: [
            ['created', 'ASC'],
            [accounts, 'created', 'ASC']
        ]
    };

    invites.findAll(filter)
        .then(function (invites) {
            return interpreterHelper.mapAppResults(invites, interpreter, resultCallback);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.findByEmailAndAccountId = function (email, accountId, resultCallback) {
    var filter = {
        where: {
            email: email,
            accountId: accountId
        },
        include: [accounts]
    };
    invites.findOne(filter)
        .then(function (foundInvite) {
            return interpreterHelper.mapAppResults(foundInvite, interpreter, resultCallback);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.findById = function (inviteId, transaction) {
    var filter = {
        where: {
            id: inviteId
        },
        include: [accounts],
        transaction: transaction
    };

    return invites.findOne(filter)
        .then(function(invite) {
            return interpreterHelper.mapAppResults(invite, interpreter);
        });
};

exports.new = function (accountId, data, resultCallback) {
    return invites.create(data)
        .then(function (invite) {
            return invites.findOne({where: {id: invite.id}, include: [accounts]})
                .then(function (inviteWithAccount) {
                    return interpreterHelper.mapAppResults(inviteWithAccount, interpreter, resultCallback);
                });
        })
        .catch(function (err) {
            if (err && err.name === errBuilder.SqlErrors.AlreadyExists) {
                resultCallback(errBuilder.Errors.User.AlreadyInvited);
            } else {
                resultCallback(err);
            }
        });
};

exports.delete = function (inviteId, transaction) {
    var filter = {
        where: {
            id: inviteId
        },
        transaction: transaction
    };
    return invites.destroy(filter);
};

exports.deleteByEmailAndAccount = function (email, accountId, resultCallback) {
    invites.destroy({where: {accountId: accountId, email: email}})
        .then(function (res) {
            resultCallback(null, res);
        })
        .catch(function (err) {
            resultCallback(err);
        });
};
