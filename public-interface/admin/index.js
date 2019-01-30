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
var removeTestUser = require('./removeTestUser');
var ResetDB = require('./resetDB');
var CreateDB = require('./createDB');
var command = process.argv[2];

switch (command) {
    case 'addUser':
        var arg = process.argv.slice(3);
        addUser.apply(null, arg);
        break;
    case 'removeTestUser':
        var removeTestUserCommand = new removeTestUser();
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
    default:
        console.log ("Command : ", command , " not supported ");
}
