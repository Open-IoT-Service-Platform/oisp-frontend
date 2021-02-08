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
    notAuthorizedMessage = errBuilder.Errors.Generic.NotAuthorized,
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
    if (req.tokenInfo.payload['resource_access'][clientId].roles.includes(clientRole)) {
        return true;
    }
    return false;
}

function hasAccessToAccountWithCorrectTokenType(req) {
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

function hasAccessToAccount(req) {
    if (!isTokenValid(req)) {
        return false;
    }
    if (!req.params.accountId && req.tokenInfo.payload.type === tokenTypes.device) {
        return true;
    }
    if (req.params.accountId) {
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
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function catalogReadAccess(req, res, next) {
    if (hasTokenClientRole(req, clientRoles.sysadmin) ||
        hasTokenClientRole(req, clientRoles.system) ||
        hasAccessToAccountWithCorrectTokenType(req)) {
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function deviceAdminAccess(req, res, next) {
    if (isAdminOfAccount(req)){
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function deviceReadAccess(req, res, next) {
    if (hasAccessToAccountWithCorrectTokenType(req)) {
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function dataWriteAccess(req, res, next) {
    if (!isTokenValid(req) || req.tokenInfo.payload.type !== tokenTypes.device) {
        return res.status(notAuthorizedCode).send(notAuthorizedMessage);
    }
    return next();
}

function userAdminAccess(req, res, next) {
    if (hasTokenClientRole(req, clientRoles.sysadmin)) {
        return next();
    }
    if (!hasTokenClientRole(req, clientRoles.user) ||
        req.tokenInfo.payload.type !== tokenTypes.user) {
        return res.status(notAuthorizedCode).send(notAuthorizedMessage);
    }
    if (req.params.userId && req.tokenInfo.payload.sub !== req.params.userId) {
        return res.status(notAuthorizedCode).send(notAuthorizedMessage);
    }
    return next();
}

function accountAdminAccess(req, res, next) {
    if (isAdminOfAccount(req) && req.tokenInfo.payload.type === tokenTypes.user) {
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function platformAdminAccess(req, res, next) {
    if (hasTokenClientRole(req, clientRoles.sysadmin)) {
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function accountOrPlatformAdminAccess(req, res, next) {
    if (hasTokenClientRole(req, clientRoles.sysadmin)) {
        return next();
    }
    if (isAdminOfAccount(req) && req.tokenInfo.payload.type === tokenTypes.user) {
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function accountReadAccess(req, res, next) {
    if (hasTokenClientRole(req, clientRoles.sysadmin)) {
        return next();
    }
    if (hasAccessToAccountWithCorrectTokenType(req) &&
        req.tokenInfo.payload.type === tokenTypes.user) {
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function accountWriteAccess(req, res, next) {
    if (hasAccessToAccountWithCorrectTokenType(req) &&
        req.tokenInfo.payload.type === tokenTypes.user) {
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function accountCreateAccess(req, res, next) {
    if (hasTokenClientRole(req, clientRoles.user) &&
        req.tokenInfo.payload.type === tokenTypes.user) {
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function alertReadAccess(req, res, next) {
    if (hasAccessToAccountWithCorrectTokenType(req) &&
        req.tokenInfo.payload.type === tokenTypes.user) {
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function systemAccess(req, res, next) {
    if (hasTokenClientRole(req, clientRoles.system)) {
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function alertWriteAccess(req, res, next) {
    if (hasTokenClientRole(req, clientRoles.sysadmin)) {
        return next();
    }
    if (hasAccessToAccountWithCorrectTokenType(req) &&
        req.tokenInfo.payload.type === tokenTypes.user) {
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function dataUserWriteAccess(req, res, next) {
    if (isAdminOfAccount(req) && req.tokenInfo.payload.type === tokenTypes.user) {
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

function dataReadAccess(req, res, next) {
    if (hasTokenClientRole(req, clientRoles.sysadmin)) {
        return next();
    }
    if (hasAccessToAccount(req)) {
        return next();
    }
    return res.status(notAuthorizedCode).send(notAuthorizedMessage);
}

module.exports = {
    "api-public": apiPublicAccess,
    "auth-read": authReadAccess,
    "data-write": dataWriteAccess,
    "catalog-read": catalogReadAccess,
    "device-admin": deviceAdminAccess,
    "device-read": deviceReadAccess,
    "user-admin": userAdminAccess,
    "account-admin": accountAdminAccess,
    "platform-admin": platformAdminAccess,
    "account-or-platform-admin": accountOrPlatformAdminAccess,
    "account-read": accountReadAccess,
    "account-write": accountWriteAccess,
    "account-create": accountCreateAccess,
    "alert-read": alertReadAccess,
    "system": systemAccess,
    "alert-write": alertWriteAccess,
    "data-user-write": dataUserWriteAccess,
    "data-read": dataReadAccess
};
