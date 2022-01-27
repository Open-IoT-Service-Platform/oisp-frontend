/**
 * Copyright (c) 2021 Intel Corporation
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

var { Kafka, logLevel, Partitioners } = require('kafkajs'),
    logger = require('../../../lib/logger').init(),
    config = require('../../../config'),
    kafkaProducer = null,
    kafkaAdmin = null;

async function getKafkaProducer() {
    if (kafkaProducer && kafkaAdmin) {
        return { producer: kafkaProducer, admin: kafkaAdmin };
    }
    var brokers = config.drsProxy.kafka.uri.split(',');
    const kafka = new Kafka({
        logLevel: logLevel.INFO,
        brokers: brokers,
        clientId: 'frontend-event-executor',
        requestTimeout: config.drsProxy.kafka.requestTimeout,
        retry: {
            maxRetryTime: config.drsProxy.kafka.maxRetryTime,
            retries: config.drsProxy.kafka.retries
        }
    });
    try {
        kafkaProducer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
        kafkaAdmin    = kafka.admin();
    } catch (exception) {
        logger.error("Exception occured creating Kafka Producer: " + exception);
        return null;
    }
    const { CONNECT, DISCONNECT } = kafkaProducer.events;
    kafkaProducer.on(DISCONNECT, e => {
        logger.info(`Disconnected!: ${e.timestamp}`);
        kafkaProducer.connect();
    });
    kafkaProducer.on(CONNECT, e => logger.info("Kafka executor producer connected: " + JSON.stringify(e)));
    try {
        await kafkaProducer.connect();
        return { producer: kafkaProducer, admin: kafkaAdmin };
    } catch (error) {
        logger.error("Could not connect to Kafka in event executor: " + error);
        return null;
    }
}

module.exports = function kafkaExecutor() {
    return {
        execute: async function (message, done) {
            var kafka = await getKafkaProducer();
            if (kafka === null) {
                var errMsg = "Could not get kafka producer, no event execution...";
                logger.error(errMsg);
                done(errMsg);
            }
            var accountId = message.content.accountId || message.content.domainId;
            logger.info("============> " + accountId + " : " +  message.content.deviceId);
            if (!message.content.accountId) {
                message.content.accountId = accountId;
            }
            var flattenedMsg = {
                type: message.type,
                transport: message.transport
            };
            Object.keys(message.content).forEach(k => {
                flattenedMsg[k] = message.content[k];
            });
            delete flattenedMsg.domainId;
            var topic = config.drsProxy.kafka.topicsActuations;
            return kafkaProducer.send({
                topic: topic,
                messages: [{ key: accountId, value: JSON.stringify(flattenedMsg) }]
            }).then(() => {
                done(null, flattenedMsg);
            }).catch(err => {
                logger.error("Could not send event to kafka: " + err);
                done(err);
            });
        }
    };
};
