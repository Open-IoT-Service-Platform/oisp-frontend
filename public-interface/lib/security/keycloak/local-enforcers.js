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

function allRoleCheck(req) {
    return isTokenValid(req);
}

function accountAdminRoleCheck(req) {
    return hasTokenClientRole(req, clientRoles.user) &&
        req.tokenInfo.payload.type === tokenTypes.user &&
        req.tokenInfo.payload.type === tokenTypes.user &&
        (req.params.accountId ? isAdminOfAccount(req) : true);
}

function accountUserRoleCheck(req) {
    return hasTokenClientRole(req, clientRoles.user) &&
        req.tokenInfo.payload.type === tokenTypes.user &&
        req.tokenInfo.payload.type === tokenTypes.user &&
        (req.params.accountId ? hasAccessToAccountWithCorrectTokenType(req) : true);
}

function deviceRoleCheck(req) {
    return hasAccessToAccountWithCorrectTokenType(req) &&
        req.tokenInfo.payload.type === tokenTypes.device;
}

function sysadminRoleCheck(req) {
    return hasTokenClientRole(req, clientRoles.sysadmin);
}

function systemRoleCheck(req) {
    return hasTokenClientRole(req, clientRoles.system);
}

const roleCheck = {
    "all": allRoleCheck,
    "account-admin": accountAdminRoleCheck,
    "account-user": accountUserRoleCheck,
    "device": deviceRoleCheck,
    "sysadmin": sysadminRoleCheck,
    "system": systemRoleCheck
};

function createRoleEnforcer(roles) {
    return (req, res, next) => {
        var accessGranted = roles.some(role => {
            return roleCheck[role](req);
        });
        if (accessGranted) {
            return next();
        } else {
            return res.status(notAuthorizedCode).send(notAuthorizedMessage);
        }
    };
}

module.exports = {
    "createRoleEnforcer": createRoleEnforcer
};
