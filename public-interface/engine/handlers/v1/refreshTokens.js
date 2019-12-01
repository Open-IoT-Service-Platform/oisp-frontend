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
    errBuilder  = require("../../../lib/errorHandler/index").errBuilder,
    decodeToken = require("../../../lib/security/authorization").decodeToken,
    Response = require('../../../lib/response').response;


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
    refresh: refresh
};
