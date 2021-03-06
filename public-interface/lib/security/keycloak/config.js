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
const fs = require('fs'),
    keycloakConfig = require('./../../../config').auth.keycloak,
    PLACEHOLDER = 'placeholder';

// singleton
var config;

module.exports.getKeycloakConfig = function() {
    if (config) {
        return config;
    }
    const json = fs.readFileSync(process.cwd() + '/keycloak.json');
    const conf = JSON.parse(json.toString());
    Object.keys(keycloakConfig).forEach(option => {
        conf[option] = keycloakConfig[option];
    });
    conf.placeholder = PLACEHOLDER;
    config = conf;
    return config;
};
