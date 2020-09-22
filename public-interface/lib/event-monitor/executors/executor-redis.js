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

var RedisConnector = require('./../../../lib/redis/connector'),
    logger = require('../../../lib/logger').init(),
    config = require('../../../config');

var redisConfig = config.controlChannel.redis;


module.exports = function() {

    return {
        execute: function (message, done) {
            var accountId = message.content.accountId || message.content.domainId;
            logger.info("============> " + accountId + " : " + message.content.accountId + "  :  " + message.content.domainId);
            message.channel = accountId + "/" + message.content.deviceId;
            var connector = RedisConnector.RedisClient(redisConfig, logger);
            connector.publish(message);
            done();
        }
    };
};
