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

var crypto = require('crypto'),
    logger = require('./logger').init();

module.exports = {
    hash: function(password, salt) {
        // salt is passed in by verify to hash a password using a previously stored salt
        salt = salt || crypto.randomBytes(32).toString('base64');
        var hashed = crypto.pbkdf2Sync(password, salt, 20000, 32,'sha1').toString('base64');
        // store the method, algorithm, iterations and keylength with the hashed password
        // this allows for backward compatibility when we implemented new hashing schemes
        // salt is stored in a separate column
        return {salt: salt,
            password: "pbkdf2::SHA1::20000::32:" + hashed
        };
    },
    hashData: function(data){
        var hash = crypto.createHash('sha1');
        hash.update(data, 'utf8');
        return hash.digest('hex');
    },
    verify: function(compare, password, salt, callback){
        var crypt = this.hash(compare, salt);
        callback(crypt.password === password);
    },
    generate: function(length){
        var aCode = null;
        try {
            aCode = crypto.randomBytes(length)
                .toString('base64')
                .replace(/(\+)*(=)*(\/)*/g,'')
                .substring(0, length);
            logger.debug('Generated ' + length + ' bytes of random data.');
        } catch (ex) {
            logger.error('Have not enough entropy to generate act Code ' + ex);
        }
        return aCode;
    }
};
