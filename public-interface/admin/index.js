#!/usr/bin/env node

/**
 * Copyright (c) 2014 Intel Corporation
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


"use strict";

var addUser = require('./addUser');
var RemoveTestUser = require('./removeTestUser');
var ResetDB = require('./resetDB');
var CreateDB = require('./createDB');
var UpdateDB = require('./updateDB');
var getUserToken = require('./getUserToken');
var resetKeycloakUsers = require('./resetKeycloakUsers');
var importExistingUsersToKeycloak = require('./importExistingUsersToKeycloak');
var addSystemUsers = require('./addSystemUsers');
var setAccountRateLimit = require('./setAccountRateLimit');
var removeDeviceKeycloakSession = require('./removeDeviceKeycloakSession');
var migrateKeycloakUIDs = require('./migrateKeycloakUIDs');
var command = process.argv[2];
var arg = process.argv[3];

switch (command) {
case 'addUser':
    var arg = process.argv.slice(3);
    addUser.apply(null, arg);
    break;
case 'removeTestUser':
    var removeTestUserCommand = new RemoveTestUser();
    removeTestUserCommand.remove();
    break;
case 'resetDB':
    var databaseResetter = new ResetDB();
    databaseResetter.reset(function(){
        console.log("Database reset");
    });
    break;
case 'createDB':
    var databaseCreater = new CreateDB();
    databaseCreater.create();
    break;
case 'updateDB':
    var databaseUpdater = new UpdateDB();
    databaseUpdater.update(arg);
    break;
case 'revertDB':
    var databaseUpdater = new UpdateDB();
    databaseUpdater.revertOne(arg);
    break;
case 'revertAllDB':
    var databaseUpdater = new UpdateDB();
    databaseUpdater.revertAll(arg);
    break;
case 'getUserToken':
    var arg = process.argv.slice(3);
    getUserToken.apply(null, arg);
    break;
case 'resetKeycloakUsers':
    resetKeycloakUsers.apply(null, null);
    break;
case 'importExistingUsersToKeycloak':
    importExistingUsersToKeycloak.apply(null, null);
    break;
case 'addSystemUsers':
    addSystemUsers.apply(null, null);
    break;
case 'setAccountRateLimit':
    var arg = process.argv.slice(3);
    setAccountRateLimit.apply(null, arg);
    break;
case 'removeDeviceKeycloakSession':
    var arg = process.argv.slice(3);
    removeDeviceKeycloakSession.apply(null, arg);
    break;
case 'migrateKeycloakUIDs':
    var arg = process.argv.slice(3);
    migrateKeycloakUIDs.apply(null, arg);
    break;
default:
    console.log ("Command : ", command , " not supported ");
}
