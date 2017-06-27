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
var jsjws = require('jsjws'),
    keyPem = require('./key-pem'),
    secConfig = require('./config');

/**
 * @description Retrieve a token or null if not presented as Bearer Authorization Token
 * if the header is no Bearer shall return null
 * @param header
 * @returns {*}
 */
var getBearerToken = function (header) {
    var token = null;
    if (header && header.indexOf("Bearer") !== -1) {
        token = header.replace(/Bearer\s+/i,"");
    }
    return token;
};

var getSubjectFromHeader = function (header) {
    var jws = new jsjws.JWS();
    try {
        var token = getBearerToken(header);
        jws.verifyJWSByKey(token, keyPem.pub_key(), secConfig.supportedAlg);

        var payload = jws.getParsedPayload();
        return payload.sub;
    } catch (err) {
        return null;
    }
};

module.exports = {
    getSubjectFromHeader: getSubjectFromHeader,
    getBearerToken: getBearerToken
};