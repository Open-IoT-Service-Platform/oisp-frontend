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
