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

"use strict";
var jwt_decode = require('jwt-decode'),
    keycloak = require('./keycloak');

module.exports.decodeToken = function(token) {
    return jwt_decode(token);
};

var getTokenInfo = function(token, req, callback){
    var decoded = jwt_decode(token);
    return keycloak.adapter.grantManager.createGrant({ access_token: token }).then(grant => {
        var tokenInfo = {
            header: grant.access_token.header,
            payload: decoded
        };
        if (req) {
            req.identity = decoded.sub;
            req.tokenInfo = tokenInfo;
            console.log("Decoded token: " + JSON.stringify(req.tokenInfo));
        }
        return callback(tokenInfo);
    }).catch((err) => {
        console.log("Error when decoding token: " + err);
        return callback(null);
    });
};

module.exports.tokenInfo = getTokenInfo;
