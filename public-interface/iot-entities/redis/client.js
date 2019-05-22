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
var config = require('../../config'),
    jaegerConfig = config.jaeger,
    redis = require("redis"),
    logger = require('../../lib/logger').init(),
    opentracing = require('opentracing'),
    shimmer = require('shimmer'),
    tracer = require('../../lib/express-jaeger').tracer,
    spanContext = require('../../lib/express-jaeger').spanContext,
    contextProvider = require('../../lib/context-provider'),
    promisify = require('util').promisify,
    client;


// Patch redis client for jaeger support
function wrapSend(original) {
    return function wrappedSend(commandObj) {
        const context = contextProvider.instance();
        var fatherSpan = context.get(spanContext.parent);
        // Track if request coming from express
        if (!fatherSpan)
        {fatherSpan = {};}
        var span = tracer.startSpan('redis-call', { childOf: fatherSpan.span });
        span.log({
            event: 'redis command',
            command: commandObj.command
        });

        var originalCb = commandObj.callback;
        commandObj.callback = function (err, replies) {
            if (err) {
                span.log({
                    event: 'redis command error',
                    err: err,
                    message: err.message,
                    stack: err.stack
                });
                span.setTag(opentracing.Tags.ERROR, true);
            }
            span.finish();
            if (originalCb)
            {originalCb(err, replies);}
        };

        original.call(this, commandObj);
    };
}

if (jaegerConfig.tracing) {
    shimmer.wrap(redis.RedisClient.prototype, 'internal_send_command', wrapSend);
}

exports.redisClient = function () {
    if(client){
        return client;
    }
    if (config.redis.port) {
        client = redis.createClient(config.redis.port, config.redis.host, {});
        client.auth(config.redis.password);
    } else {
        client = redis.createClient();
    }
    client.getAsync = promisify(client.get).bind(client);
    client.setAsync = promisify(client.set).bind(client);

    client.on("error", function (err) {
        logger.error("Redis client error " + err);
        throw(err);
    });

    return client;
};
