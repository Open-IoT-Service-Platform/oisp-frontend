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
    Device = postgresProvider.devices,
    tokenTypes = require('../../../lib/security/config').tokenTypes,
    logger = require('../../../lib/logger/index').init(),
    errBuilder  = require("../../../lib/errorHandler/index").errBuilder,
    keycloak = require('../../../lib/security/keycloak');

var refreshJWTToken = function(oldToken, refreshToken, deviceUID) {
    var headers = {
        'X-Access-Type': oldToken.type
    };
    if (oldToken.type === tokenTypes.device) {
        headers['X-DeviceID'] = oldToken.sub;
        headers['X-DeviceUID'] = deviceUID;
        headers['X-Activation-Code'] = keycloak.placeholder;
    }
    return keycloak.customGrants.ensureFreshness(refreshToken, headers)
        .catch(err => {
            logger.error("Could not refresh token: " + JSON.stringify(err));
            throw errBuilder.build(errBuilder.Errors.RefreshToken.RefreshError);
        });
};

exports.refresh = function(refreshToken, oldToken) {
    var tokens = {};
    if (oldToken.type === tokenTypes.device) {
        var deviceId = oldToken.sub;
        var accountId = oldToken.accounts[0].id;
        return Device.findByIdAndAccount(deviceId, accountId).then(result => {
            if (!result) {
                throw errBuilder.build(errBuilder.Errors.Device.NotFound);
            }
            return refreshJWTToken(oldToken, refreshToken, result.uid).then(grant => {
                tokens.jwt = grant.access_token;
                tokens.refreshToken = grant.refresh_token;
                return tokens;
            });
        });
    } else {
        return refreshJWTToken(oldToken, refreshToken).then(grant => {
            tokens.jwt = grant.access_token;
            tokens.refreshToken = grant.refresh_token;
            return tokens;
        });
    }
};
