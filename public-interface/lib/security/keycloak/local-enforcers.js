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
const clientId = require('./config').getKeycloakConfig().resource,
    errBuilder = require('./../../errorHandler').errBuilder,
    notAuthorizedCode = errBuilder.Errors.Generic.NotAuthorized.code,
    notAuthorizedMessage = errBuilder.Errors.Generic.NotAuthorized.message,
    clientRoles = {
        user: "user",
        sysadmin: "sysadmin",
        system: "system"
    },
    tokenTypes = {
        user: "user",
        device: "device"
    },
    accountRoles = {
        admin: "admin",
        user: "user"
    };

// Helper functions for local enforcers

function isTokenValid(req) {
    if (!req.tokenInfo || !req.tokenInfo.header) {
        return false;
    }
    return true;
}

function hasTokenClientRole(req, clientRole) {
    if (!isTokenValid(req)) {
        return false;
    }
    if (!req.tokenInfo.payload['resource_access'][clientId] ||
        !req.tokenInfo.payload['resource_access'][clientId].roles) {
        return false;
    }
    if (req.tokenInfo.payload['resource_access'][clientId].roles.includes[clientRole]) {
        return true;
    }
    return false;
}

function hasAccessToAccount(req) {
    if (!isTokenValid(req)) {
        return false;
    }
    if (!req.params.accountId && req.tokenInfo.payload.type === tokenTypes.device) {
        return true;
    }
    if (req.params.accountId && req.tokenInfo.payload.type === tokenTypes.user) {
        return req.tokenInfo.payload.accounts
            .some(account => account.id === req.params.accountId);
    }
    return false;
}

function isAdminOfAccount(req) {
    if (!isTokenValid(req)) {
        return false;
    }
    if (!req.params.accountId && req.tokenInfo.payload.type === tokenTypes.device) {
        return true;
    }
    if (req.params.accountId && req.tokenInfo.payload.type === tokenTypes.user) {
        return req.tokenInfo.payload.accounts
            .some(account => account.id === req.params.accountId && account.role === accountRoles.admin);
    }
    return false;
}

// Local enforcer functions

function apiPublicAccess(req, res, next) {
    return next();
}

function authReadAccess(req, res, next) {
    if (isTokenValid(req)) {
        return next();
    }
    return res.status(notAuthorizedCode.send(notAuthorizedMessage));
}

function catalogReadAccess(req, res, next) {
    if (hasTokenClientRole(req, clientRoles.sysadmin) ||
        hasTokenClientRole(req, clientRoles.system) || hasAccessToAccount(req)) {
        return next();
    }
    return res.status(notAuthorizedCode.send(notAuthorizedMessage));
}

function deviceAdminAccess(req, res, next) {
    if (isAdminOfAccount(req)){
        return next();
    }
    return res.status(notAuthorizedCode.send(notAuthorizedMessage));
}

function deviceReadAccess(req, res, next) {
    if (hasAccessToAccount(req)) {
        return next();
    }
    return res.status(notAuthorizedCode.send(notAuthorizedMessage));
}

function dataWriteAccess(req, res, next) {
    if (!isTokenValid(req) || req.tokenInfo.payload.type !== tokenTypes.device) {
        return res.status(notAuthorizedCode).send(notAuthorizedMessage);
    }
    return next();
}

module.exports = {
    "api-public": apiPublicAccess,
    "auth-read": authReadAccess,
    "data-write": dataWriteAccess,
    "catalog-read": catalogReadAccess,
    "device-admin": deviceAdminAccess,
    "device-read": deviceReadAccess
};
