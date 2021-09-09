/**
 * Copyright (c) 2021 Intel Corporation
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

const postgresProvider = require('../iot-entities/postgresql'),
    users = postgresProvider.users,
    keycloak = require('../lib/security/keycloak');

module.exports = function() {
    var currentBatch = arguments.length >= 1 ? parseInt(arguments[0]) : 1;
    var batchSize = arguments.length >= 2 ? parseInt(arguments[1]) : 25;
    users.usersCount().then(count => {
        console.log(count + " users has been found.");
        console.log("Migrating with batch size: " + batchSize);
        var offset = (currentBatch - 1) * batchSize;
        var batchCount = Math.ceil(count / batchSize);
        var updateNextBatch = function() {
            if (offset >= count) {
                return Promise.resolve();
            }
            console.log("Migrating batch (" + currentBatch + "/" + batchCount  + ")...");
            var oispUserIds = [];
            return users.findAndCountAll(offset, batchSize).then(oispUsers => {
                var promises = oispUsers.rows.map(oispUser => {
                    oispUserIds.push(oispUser.id);
                    const userData = {
                        email: oispUser.email
                    };
                    return keycloak.serviceAccount.findUserByParameters(userData);
                });
                return Promise.all(promises);
            }).then(keycloakUsers => {
                var promises = keycloakUsers.map((keycloakUser, index) => {
                    if (keycloakUser && keycloakUser.id !== oispUserIds[index]) {
                        if (!keycloakUser.attributes) {
                            keycloakUser.attributes = {};
                        }
                        keycloakUser.attributes.legacy_app_uid = oispUserIds[index];
                        return keycloak.serviceAccount.updateUserWithoutFetch(keycloakUser);
                    }
                });
                return Promise.all(promises);
            }).then(() => {
                console.log("Migrated batch (" + currentBatch + "/" + batchCount  + ") successfully!");
                offset += batchSize;
                currentBatch++;
                return updateNextBatch();
            }).catch(err => {
                console.log("Error occurred during migration: " + err);
                process.exit(1);
            });
        };
        return updateNextBatch();
    }).then(() => {
        console.log("All users in OISP are migrated into Keycloak successfully!");
        process.exit(0);
    });
};
