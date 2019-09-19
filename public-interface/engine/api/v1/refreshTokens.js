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

var postgresProvider = require('../../../iot-entities/postgresql'),
    User = postgresProvider.users,
    Device = postgresProvider.devices,
    RefreshToken = postgresProvider.refreshTokens,
    refreshTokenExpire = require('../../../lib/security/config').refresh_token_expire * 60 * 1000,
    tokenTypes = require('../../../lib/security/config').tokenTypes,
    logger = require('../../../lib/logger/index').init(),
    errBuilder  = require("../../../lib/errorHandler/index").errBuilder,
    Q = require('q'),
    auth = require('../../../lib/security/index').authorization;

var refreshJWTToken = function(oldToken) {
    return Q.nfcall(auth.generateToken, oldToken.sub, oldToken.accounts,
        oldToken.role, refreshTokenExpire, oldToken.type)
        .catch(function(err) {
            logger.error("The Token could not be generated " + JSON.stringify(err));
            throw errBuilder.build(errBuilder.Errors.RefreshToken.RefreshError);
        });
};

exports.refresh = function(refreshToken, oldToken) {
    var tokens = {};
    var oldRefreshToken;
    return RefreshToken.findByToken(refreshToken).then(result => {
        if (!result) {
            throw errBuilder.build(errBuilder.Errors.RefreshToken.InvalidToken);
        }
        oldRefreshToken = result;
        var expireDate = new Date(result.exp);
        if (new Date() > expireDate) {
            throw errBuilder.build(errBuilder.Errors.RefreshToken.ExpireError);
        }
        return refreshJWTToken(oldToken);
    }).then(newAccessToken => {
        tokens.jwt = newAccessToken;
        return RefreshToken.new(oldRefreshToken.id, new Date() + refreshTokenExpire,
            oldRefreshToken.type);
    }).then(newRefreshToken => {
        tokens.refreshToken = newRefreshToken;
        return tokens;
    });
};

exports.revoke = function(refreshToken) {
    return RefreshToken.destroyByToken(refreshToken);
};

exports.create = function(id, type, accountId) {
    if (tokenTypes.device === type) {
        return Device.findByIdAndAccount(id, accountId).then(result => {
            if (!result) {
                throw errBuilder.build(errBuilder.Errors.Device.NotFound);
            }
            return RefreshToken.new(result.uid, new Date() + refreshTokenExpire, type);
        }).then(refreshToken => {
            return { refreshToken: refreshToken };
        });
    } else if (tokenTypes.user === type) {
        return User.findById(id).then(result => {
            if (!result) {
                throw errBuilder.build(errBuilder.Errors.User.NotFound);
            }
            return RefreshToken.new(result.id, new Date() + refreshTokenExpire, type);
        }).then(refreshToken => {
            return { refreshToken: refreshToken };
        });
    } else {
        throw errBuilder.build(errBuilder.Errors.Generic.InternalServerError);
    }
};
