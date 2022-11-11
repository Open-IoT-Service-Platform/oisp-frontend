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

var ExecutorFactory = require('./executor-factory'),
    logger = require('../../lib/logger').init(),
    config = require('../../config');

function getExecutor(transport) {
    if (transport === 'ws' || transport === 'mqtt' || transport === 'auto') {
        return 'kafka';
    }
    return transport;
}

function MessageProcessor(executors) {

    var _executorCollection = executors;

    function processMessage(message, done){
        logger.info("Message Processor - message arrived: " + JSON.stringify(message, null, "\t"));
        var executor = getExecutor(message.transport);
        logger.info("Executor " + executor);
        if( _executorCollection[executor]) {
            var instance = new _executorCollection[executor](config, logger);
            instance.execute(message, function(err, result) {
                logger.info("MessageProcessor - message handled " + ((err !== "undefined") ? "successfully":"with errors"));
                if(result) {
                    logger.info("MessageProcessor - Result: " + JSON.stringify(result));
                }
                if (done) {
                    done(err,result);
                }
            });
        } else {
            logger.info("MessageProcessor - No executor knows how to send message of type [" + message.transport +"]");
        }
    }

    this.listen = function(event){
        process.on(event, processMessage);
        logger.info("Message Event Processor started.");
    };
}

function start() {

    logger.info("Starting Event Monitor...");
    var executorPath = __dirname  + "/executors/";

    var factory = new ExecutorFactory();
    factory.buildExecutors(executorPath, function(executors){
        if (executors) {
            var messageProcessor = new MessageProcessor(executors);
            messageProcessor.listen("incoming_message");
        } else {
            logger.error("No Executors available. Message processor won't do anything");
        }
        logger.info("Event Monitor Started.");
    });
}

function main(){
    return {
        start: start
    };
}

module.exports = main;
