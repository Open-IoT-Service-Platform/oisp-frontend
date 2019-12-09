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
const pathConfigs = require('./config').getKeycloakConfig()['policy-enforcer'].paths,
    ENFORCEMENT_MODES = {
        DISABLED: 'DISABLED',
        ENFORCING: 'ENFORCING' // default
    },
    SCOPES_ENFORCEMENT_MODES = {
        ALL: 'ALL', // default
        ANY: 'ANY'
    };

function getClaims(request) {
    return {
        "accessed-endpoint": [request.path]
    };
}

function enforceAnyScope(resource, scopes, keycloak) {
    return function(req, res, next) {
        const claims = getClaims(req);
        const authzRequest = {
            audience: keycloak.grantManager.clientId,
            response_mode: 'permissions',
            permissions: scopes.map(scope => { return { id: resource, scopes: [scope] }; }),
            claim_token: Buffer.from(JSON.stringify(claims)).toString('base64'),
            claim_token_format: 'urn:ietf:params:oauth:token-type:jwt'
        };
        keycloak.checkPermissions(authzRequest, req, function(permissions) {
            const isAllowed = scopes.some(scope => {
                return permissions.some(permission => {
                    return (permission.rsid === resource || permission.rsname === resource) &&
                        permission.scopes.includes(scope);
                });
            });
            if (isAllowed) {
                return next();
            }
            return keycloak.accessDenied(req, res, next);
        });
    };
}

function enforceAllScopes(permissions, keycloak) {
    return keycloak.enforcer(permissions, { claims: getClaims });
}

module.exports.register = function(app, keycloak) {
    pathConfigs.forEach(pathConfig => {
        if (pathConfig['enforcement-mode'] === ENFORCEMENT_MODES.DISABLED) {
            return;
        }
        const name = pathConfig.name;
        const path = pathConfig.path;
        pathConfig.methods.forEach(methodConfig => {
            const method = methodConfig.method.toLowerCase();
            const scopes = methodConfig.scopes;
            if (methodConfig['scopes-enforcement-mode'] === SCOPES_ENFORCEMENT_MODES.ANY) {
                app[method](path, enforceAnyScope(name, scopes, keycloak));
            } else {
                const permissions = scopes.map(scope => name + ':' + scope);
                app[method](path, enforceAllScopes(permissions, keycloak));
            }
        });
    });
};
