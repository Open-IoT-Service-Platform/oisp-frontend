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

const postgresProvider = require('../iot-entities/postgresql'),
    users = postgresProvider.users,
    keycloak = require('../lib/security/keycloak');

module.exports = function() {
    const promises = [];
    keycloak.serviceAccount.getUsers().then(keycloakUsers => {
        const emailSet = [];
        keycloakUsers.forEach(keycloakUser => {
            emailSet.push(keycloakUser.email);
        });
        return users.getUsersNotInSet(null, emailSet);
    }).then(oispUsers => {
        oispUsers.forEach(oispUser => {
            const userData = {
                email: oispUser.email,
                attributes: {
                    legacy_app_uid: oispUser.id
                },
                verified: oispUser.verified === false ? false : true,
                termsAndConditions: oispUser.termsAndConditions === false ? false : true,
                roles: oispUser.type ? [oispUser.type] : []
            };
            promises.push(keycloak.serviceAccount.createUser(userData));
        });
        return Promise.all(promises);
    }).then(() => {
        console.log('All users in OISP are imported to keycloak successfully');
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
};
