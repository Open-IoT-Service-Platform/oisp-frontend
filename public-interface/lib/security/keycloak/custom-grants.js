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
const rp = require('request-promise');

module.exports = function getCustomGrants(clientId, secret, realmUrl, clientPublic) {
    function postOptions(path, authorizationFlag) {
        const realPath = path || '/protocol/openid-connect/token';
        const opts = {
            uri: realmUrl + realPath,
            headers: {}
        };
        if (!clientPublic && authorizationFlag !== false) {
            opts.headers.Authorization = 'Basic ' + Buffer.from(clientId + ':' + secret).toString('base64');
        }
        opts.method = 'POST';
        return opts;
    }

    // Based on keycloak-connect adapter allowing to pass extra headers for keycloak
    function obtainDirectlyWithCustomHeaders(username, password, headers, scopeParam) {
        const params = {
            client_id: clientId,
            username: username,
            password: password,
            grant_type: 'password',
            scope: 'openid'
        };
        if (scopeParam) {
            params.scope = params.scope + ' ' + scopeParam;
        }
        const options = postOptions();
        Object.keys(headers).forEach(header => {
            options.headers[header] = headers[header];
        });
        options.form = params;
        return rp(options).then(res => JSON.parse(res));
    }

    function exchangeTokenWithCustomHeaders(accessToken, headers) {
        const params = {
            client_id: clientId,
            client_secret: secret,
            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
            subject_token: accessToken,
            requested_token_type: 'urn:ietf:params:oauth:token-type:refresh_token',
            audience: clientId
        };
        const options = postOptions(null, false);
        Object.keys(headers).forEach(header => {
            options.headers[header] = headers[header];
        });
        options.form = params;
        return rp(options).then(res => JSON.parse(res));
    }

    function impersonateUser(accessToken, user, headers, scopeParam) {
        const params = {
            client_id: clientId,
            client_secret: secret,
            grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
            subject_token: accessToken,
            requested_subject: user,
            requested_token_type: 'urn:ietf:params:oauth:token-type:refresh_token',
            audience: clientId,
            scope: 'openid'
        };
        if (scopeParam) {
            params.scope = params.scope + ' ' + scopeParam;
        }
        const options = postOptions(null, false);
        Object.keys(headers).forEach(header => {
            options.headers[header] = headers[header];
        });
        options.form = params;
        return rp(options).then(res => JSON.parse(res));
    }

    // Do not check expired if refresh token is type of offline
    function ensureFreshness(refresh_token, headers) {
        if (!refresh_token) {
            return Promise.reject(new Error('Unable to refresh without a refresh token'));
        }
        const params = {
            grant_type: 'refresh_token',
            refresh_token: refresh_token,
            client_id: clientId
        };
        const options = postOptions();
        Object.keys(headers).forEach(header => {
            options.headers[header] = headers[header];
        });
        options.form = params;
        return rp(options).then(res => JSON.parse(res));
    }

    return {
        ensureFreshness: ensureFreshness,
        impersonateUser: impersonateUser,
        obtainDirectlyWithCustomHeaders: obtainDirectlyWithCustomHeaders,
        exchangeToken: exchangeTokenWithCustomHeaders
    };
};
