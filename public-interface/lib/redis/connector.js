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

var redis = require('redis');

function RedisClient(conf, logger) {
    var me = this;
    me.logger = logger;
    me.host = conf.host;
    me.port = conf.port;
    me.retryTime = conf.retryTime || 3000;
    me.retriesLimit = conf.retriesLimit || 10;
    me.enableOfflineQueue = conf.enableOfflineQueue || true;
    me.connected = false;
    me.attempts = 0;

    me.connect = function() {
        if(!me.connected) {
            logger.info("Trying to establish a connection with redis server... (attempt = " + (me.attempts++) + ")");

            me.client = redis.createClient(me.port, me.host, {
                password: me.password,
                enable_offline_queue : me.enableOfflineQueue
            });

            me.client.on('error', function() {
                logger.error("Redis Client cannot connect.");
            });

            me.client.on('end', function() {
                logger.error("Redis Client disconnected.");
                me.connected = false;
            });

            me.client.on('connect', function(){
                logger.info('Redis Client connected on port: ' + me.port);
                me.connected = true;
            });
        }
    };

    me.publish = function(message) {
        var channel = message.channel;
        me.logger.info('============> Publishing : channel => ' + channel);
        if ( channel ) {
            if(!me.connected) {
                if(me.attempts < me.retriesLimit) {
                    me.connect();
                    setTimeout(function() {
                        me.publish(message);
                    }, me.retryTime);
                } else {
                    me.logger.error('Cannot connect to redis server - ' + me.host + ':' + me.port + '. Actuation cannot be sent');
                }
            } else {
                me.attempts = 0;
                me.logger.info('============> Publishing : MSG => ' + JSON.stringify(message));
                delete message.channel;
                var messageObject = {
                    "type": 'actuation',
                    "body": message,
                    "credentials": {
                        "username": conf.username,
                        "password": conf.password
                    }
                };
                me.client.publish(channel, JSON.stringify(messageObject));
            }
        }

    };
    return me;
}

var redisConnector= null;
module.exports.singleton = function (conf, logger) {
    if (!redisConnector) {
        redisConnector = new RedisClient(conf, logger);
    }
    return redisConnector;
};
module.exports.RedisClient = RedisClient;
