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
    async = require('async'),
    logger = require('../../lib/logger').init(),
    config = require('../../config');

var ACTUATOR_TYPE = 'actuation';

function getExecutor(transport) {
    if (transport === 'ws' || transport === 'mqtt' || transport === 'auto') {
        return 'kafka';
    }
    return transport;
}

function AlertProcessor(executors) {

    function executeAlertAction(executors, data, actionType, resultCallback) {
        var _executorCollection = executors;
        var executor = getExecutor(actionType);
        logger.info("Executor " + executor);
        if( _executorCollection[executor]) {
            var instance = new _executorCollection[executor](config, logger);
            instance.execute(data, function(err, result) {
                logger.info("AlertProcessor - Action executed " + ((err !== "undefined") ? "successfully":"with errors"));
                if(result) {
                    logger.info("AlertProcessor - Result: " + JSON.stringify(result));
                }
                resultCallback(err);
            });
        } else {
            resultCallback("AlertProcessor - No executor knows how to execute actions of type [" + actionType +"]");
        }
    }

    function processAlert(data){
        logger.info("AlertProcessor - Alert arrived: " + JSON.stringify(data));
        async.each(data.rule.actions, function(action, done){
            if (action.type === ACTUATOR_TYPE) {
                async.each(action.messages, function (message, parallelCallback) {
                    executeAlertAction(executors, message, message.transport, function (err) {
                        parallelCallback(err);
                    });
                }, function (err) {
                    if (done) {
                        done(err);
                    }
                });
            } else {
                executeAlertAction(executors, {action: action, data: data.alert}, action.type, function (err) {
                    if (done) {
                        done(err);
                    }
                });
            }
        }, function(err) {
            if (err) {
                logger.error(err);
                logger.error("AlertProcessor - An error ocurred while executing actions for rule " + data.rule.id + " account " + data.alert.accountId);
            }
        });
    }

    this.listen = function(event){
        process.on(event, processAlert);
        logger.info("Alert Event Processor started.");
    };
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
            var alertProcessor = new AlertProcessor(executors);
            alertProcessor.listen("incoming_alert");
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
