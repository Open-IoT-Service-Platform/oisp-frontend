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

var refreshTokens = require('../../api/v1/refreshTokens'),
    httpStatuses = require('../../res/httpStatuses'),
    tokenTypes = require('../../../lib/security/config').tokenTypes,
    errBuilder  = require("../../../lib/errorHandler/index").errBuilder,
    decodeToken = require("../../../lib/security/authorization").decodeToken,
    Response = require('../../../lib/response').response;

var create = function(req, res, next) {
    var responder = new Response(res, next);
    var id = req.tokenInfo.payload.sub;
    var type = req.tokenInfo.payload.type;
    var accountId = null;
    if (type === tokenTypes.device) {
        accountId = req.tokenInfo.payload.accounts[0].id;
    }
    refreshTokens.create(id, type, accountId).then(result => {
        responder(httpStatuses.OK.code, result);
    }).catch(err => {
        responder(err);
    });
};

var revoke = function(req, res, next) {
    var responder = new Response(res, next);
    if(!req.body.refreshToken){
        return responder(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
    }
    refreshTokens.revoke(req.body.refreshToken).then(() => {
        responder(httpStatuses.OK.code);
    }).catch(err => {
        responder(err);
    });
};

var refresh = function(req, res, next) {
    var responder = new Response(res, next);
    var tokenPayload = decodeToken(req.headers.authorization);
    if(!req.body.refreshToken || !tokenPayload){
        return responder(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest));
    }
    refreshTokens.refresh(req.body.refreshToken, tokenPayload).then(result => {
        responder(httpStatuses.OK.code, result);
    }).catch(err => {
        responder(err);
    });
};

module.exports = {
    create: create,
    revoke: revoke,
    refresh: refresh
};
