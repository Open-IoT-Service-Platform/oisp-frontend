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

'use strict';

var postgresProvider = require('../iot-entities/postgresql'),
    user = postgresProvider.users,
    cryptoUtils = require('../lib/cryptoUtils');

function add (data) {
    return user.new(data, null)
        .then (function (result) {
            if (result) {
                console.log("User has been added: ", result);
                process.exit(0);
            } else {
                throw new Error('Could not add user');
            }
        })
        .catch(function(err) {
            console.error("Could not add user. Error: ", err);
            process.exit(1);
        });
}

function update (data) {
    return user.update(data, null)
        .then(function (result) {
            if (result) {
                console.log("User has been updated: ", data);
                process.exit(0);
            }
            else {
                throw new Error("Could not update user");
            }
        })
        .catch(function(err) {
            console.error("Could not update user. Error: ", err);
            process.exit(1);
        });
}

module.exports = function () {
    if (arguments.length < 3) {
        console.error("Not enough arguments : ", arguments);
        process.exit(1);
    }
    var email = arguments[0],
        pass = arguments[1],
        role = arguments[2];
    var userData = {
        email: email,
        password: "",
        salt: "",
        role: "",
        verified: true,
        termsAndConditions: true
    };
    if (email && pass && role) {
        userData.email = email;
        userData.role = role;
        var crypt = cryptoUtils.hash(pass);
        userData.password = crypt.password;
        userData.salt = crypt.salt;
        user.findByEmail(userData.email, function (err, result) {
            if (!err && result) {
                userData.id = result.id;
                update(userData);
            } else {
                add(userData);
            }
        });
    }
};
