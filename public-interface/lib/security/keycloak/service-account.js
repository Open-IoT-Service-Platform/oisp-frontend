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
const KcAdminClient = require('keycloak-admin').default,
    errBuilder  = require('./../../../lib/errorHandler').errBuilder,
    DEFAULT_ROLE = "user",
    MAX_COUNT = Math.pow(2, 31) - 1,
    // defined in keycloak rest api specification
    VERIFY_EMAIL = "VERIFY_EMAIL",
    TERMS_AND_CONDITIONS = "terms_and_conditions";

module.exports = function ServiceAccount(keycloakAdapter) {
    this.keycloak = keycloakAdapter;
    this.grant = null;

    this.ensureServiceAccountGrant = function ensureServiceAccountGrant() {
        if (this.grant && !this.grant.isExpired()) {
            return Promise.resolve(this.grant);
        }
        return this.keycloak.grantManager.obtainFromClientCredentials()
            .then(grant => {
                this.admin.setAccessToken(grant.access_token.token);
                this.grant = grant;
                return grant;
            });
    };

    this.getClientUID = function() {
        return this.ensureServiceAccountGrant().then(() => {
            return this.admin.clients.findOne({ clientId: this.keycloak.config.clientId });
        }).then(clients => {
            return clients[0].id;
        });
    };

    this.getUsers = function() {
        return this.ensureServiceAccountGrant().then(() => {
            return this.admin.users.find({max: MAX_COUNT});
        });
    };

    this.findUserByParameters = function(parameters) {
        if (!parameters) {
            return Promise.resolve({});
        }
        return this.ensureServiceAccountGrant(this).then(() => {
            return this.admin.users.find(parameters);
        }).then(users => {
            return users[0];
        });
    };

    this.updateUserByEmail = function(email, userData) {
        return this.ensureServiceAccountGrant(this).then(() => {
            return this.admin.users.find({ email: email });
        }).then(foundUsers => {
            if (!foundUsers || !foundUsers[0]) {
                throw errBuilder.Errors.User.NotFound;
            }
            const foundUser = foundUsers[0];
            return this.updateUserById(foundUser.id, userData);
        });
    };

    this.updateUserById = function(id, userData) {
        return this.ensureServiceAccountGrant().then(() => {
            var data = {};
            if (userData.attributes) {
                data.attributes = userData.attributes;
            }

            data.requiredActions = [];

            if (userData.verified === false) {
                data.requiredActions.push(VERIFY_EMAIL);
            } else if (userData.verified) {
                data.emailVerified = userData.verified;
            }

            if (userData.termsAndConditions === false) {
                data.requiredActions.push(TERMS_AND_CONDITIONS);
            }

            return this.admin.users.findOne({id: id}).then(user => {
                if (user.attributes) {
                    if (!data.attributes) {
                        data.attributes = {};
                    }
                    Object.keys(user.attributes).forEach(attr => {
                        if (!data.attributes[attr]) {
                            data.attributes[attr] = user.attributes[attr];
                        }
                    });
                }
                return this.admin.users.update({id: id}, data);
            });
        });
    };

    this.createUser = function createUser(userData) {
        var clientUID;
        var availableRoles;
        var userId;
        return this.ensureServiceAccountGrant(this).then(() => {
            const data = {
                username: userData.username ? userData.username : userData.email,
                email: userData.email,
                attributes: userData.attributes ? userData.attributes : {},
                requiredActions: [],
                enabled: true
            };
            if (userData.verified) {
                data.emailVerified = userData.verified;
            } else {
                data.requiredActions.push(VERIFY_EMAIL);
            }
            if (!userData.termsAndConditions) {
                data.requiredActions.push(TERMS_AND_CONDITIONS);
            }
            return this.admin.users.create(data);
        }).then(() => {
            return this.getClientUID();
        }).then(cuid => {
            clientUID = cuid;
            return this.admin.clients.listRoles({ id: clientUID });
        }).then(roles => {
            availableRoles = roles;
            return this.findUserByParameters({ email: userData.email });
        }).then(user => {
            userId = user.id;
            if (userData.password) {
                return this.changeUserPassword(userId, userData.password);
            }
            return Promise.resolve();
        }).then(() => {
            var assignedRoles = [];
            if (userData.roles) {
                userData.roles.forEach(role => {
                    assignedRoles.push(availableRoles.find(ar => ar.name === role));
                });
            }
            return this.admin.users.addClientRoleMappings({
                id: userId,
                clientUniqueId: clientUID,
                roles: assignedRoles
            });
        }).then(() => {
            var toDelete = [];
            if (userData.roles) {
                if (!userData.roles.find(role => role === DEFAULT_ROLE)) {
                    toDelete.push(availableRoles.find(role => role.name === DEFAULT_ROLE));
                }
            }
            return this.admin.users.delClientRoleMappings({
                id: userId,
                clientUniqueId: clientUID,
                roles: toDelete
            });
        });
    };

    this.deleteUser = function deleteUser(userId) {
        return this.ensureServiceAccountGrant(this).then(() => {
            return this.admin.users.del({id: userId});
        });
    };

    this.changeUserPassword = function changeUserPassword(id, password) {
        return this.ensureServiceAccountGrant().then(() => {
            const cred = {
                type: "password",
                value: password,
                temporary: false
            };
            return this.admin.users.resetPassword({
                id: id,
                credential: cred
            });
        });
    };

    this.admin = new KcAdminClient();
    this.admin.setConfig({
        realmName: this.keycloak.config.realm,
        baseUrl: this.keycloak.config.authServerUrl
    });
};
