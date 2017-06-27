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

var routes = require('./routes.config'),
    roles = require('./roles.config'),
    keys_config = require('../../../config').auth.keys;

module.exports = {
    roles: roles,
    routes: routes,
    private_pem_path: keys_config.private_pem_path,
    public_pem_path: keys_config.public_pem_path,
    default_activation_code_expire: 60, // 1 Hour year (in minutes)
    default_token_expire: 5256000, // 10 years (in minutes)
    user_token_expire: 1440, // 24 hours (in minutes)
    iss: 'http://enableiot.com', // JWT Issuer
    alg: 'RS256', // signature algorithm. Options:  RS256, RS512, PS256, PS512, HS256, HS512,
    supportedAlg: ["RS256", "RS512", "PS256", "PS512", "HS256", "HS512"]
};