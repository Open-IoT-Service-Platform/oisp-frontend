/**
 * Copyright (c) 2014-2020 Intel Corporation
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
/* esversion: 8  */
'use strict';
var { Kafka, logLevel } = require('kafkajs'),
    config = require('../config'),
    logger = require('./logger').init(),
    heartBeatInterval = null;
var kafkaProducer = null;
var kafkaAdmin = null;

const heartbeat = (producer, partition, topic) => {
    return producer
        .send({
            topic,
            messages: [{key: "heartbeat", value:"dashboard", partition: 0}]
        })
        .then(console.log("--------------------Sending heartbeat ..."))
        .catch(async (e) => {
            logger.error("Error while sending to topic " + topic + " error: " + e);
            await kafkaProducer.disconnect();
        });
};

exports.start = function () {
    var brokers = config.drsProxy.kafka.uri.split(',');
    const kafka = new Kafka({
        logLevel: logLevel.INFO,
        brokers: brokers,
        clientId: 'frontend-heartbeat',
        requestTimeout: config.drsProxy.kafka.requestTimeout,
        retry: {
            maxRetryTime: config.drsProxy.kafka.maxRetryTime,
            retries: config.drsProxy.kafka.retries
        }
    });
    kafkaProducer = kafka.producer();
    kafkaAdmin    = kafka.admin();
    const { CONNECT, DISCONNECT} = kafkaProducer.events;

    const run = async () => {
        var topic = config.drsProxy.kafka.topicsHeartbeatName;
        var interval = parseInt(config.drsProxy.kafka.topicsHeartbeatInterval);
        var partition = 0;
        var replicationFactor = config.drsProxy.kafka.replication;
        try {
            await kafkaProducer.connect();
            await kafkaAdmin.createTopics({
                topics: [{topic: topic, replicationFactor, numPartitions: 1}]
            });
        } catch (error) {
            return logger.error("Error while connecting to channel and creating topic: " + error);
        }
        heartBeatInterval = setInterval( function (producer, partition, topic) {
            heartbeat(producer, partition, topic);
        }, interval, kafkaProducer, partition, topic );
    };

    run().catch(e => console.error("Kafka runtime error " + e));

    kafkaProducer.on(DISCONNECT, e => {
        console.log(`Disconnected!: ${e.timestamp}`);
        kafkaProducer.connect();
    });
    kafkaProducer.on(CONNECT, e => logger.debug("Kafka heartbeat producer connected: " + e));
};

exports.stop = function () {
    if ( heartBeatInterval != null ) {
        clearInterval(heartBeatInterval);
    }
};
