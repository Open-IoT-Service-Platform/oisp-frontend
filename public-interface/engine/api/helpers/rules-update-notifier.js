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
var Kafka = require('kafka-node'),
    config = require('../../../config'),
    logger = require('../../../lib/logger').init(),
    kafkaProducer = null;

exports.notify = function () {
    if ( kafkaProducer === null ) {
        var kafkaClient;
        try {
            kafkaClient = new Kafka.KafkaClient({kafkaHost: config.drsProxy.kafka.hosts});
        } catch (exception) {
            logger.error("Exception occured creating Kafka Client: " + exception);
        }
        try {
            kafkaProducer = new Kafka.HighLevelProducer(kafkaClient, {
                requireAcks: 1, // 1 = Leader ack required
                ackTimeoutMs: 500
            });
        } catch (exception) {
            logger.error("Exception occured creating Kafka Producer: " + exception);
        }
    }

    try {
        kafkaProducer.send([
            {
                topic: config.drsProxy.kafka.topics.rule_engine,
                messages: ""
            }
        ], function (err) {
            if (err) {
                logger.error("Error when sending rules-update message to Kafka: " + JSON.stringify(err));
            } 
        });
    } catch(exception) {
        logger.error("Exception occured when sending rules-update message to Kafka: " + exception);
    }

};
