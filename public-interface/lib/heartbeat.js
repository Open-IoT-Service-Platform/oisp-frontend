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
    config = require('../config'),
    logger = require('./logger').init(),
    rulesUpdateNotifier = require('../engine/api/helpers/rules-update-notifier'),
    heartBeatInterval = null;
    var kafkaClient = null;
    var kafkaProducer = null;

var heartBeat = function(producer, partition, topic) {
    if ( producer != null) {
        try {
            console.log("--------------------Sending heartbeat ...")
            producer.send([
                {
                    topic: topic,
                    partition: partition,
                    messages: "dashboard"
                }
            ], function (err) {
                if (err) {
                    logger.error("Error when sending heartbear message to Kafka: " + JSON.stringify(err));
                } 
            });
        } catch(exception) {
            logger.error("Exception occured when sending heartbear message to Kafka: " + exception);
        }
    }
}

exports.start = function () {
  
    kafkaClient = new Kafka.KafkaClient({kafkaHost: config.drsProxy.kafka.uri});

    kafkaProducer = new Kafka.HighLevelProducer(kafkaClient, { requireAcks: 1, ackTimeoutMs: 500 });    

    kafkaProducer.on('ready', function () {
        var topic = config.drsProxy.kafka.topicsHeartbeatName;
        var interval = parseInt(config.drsProxy.kafka.topicsHeartbeatInterval);
        var partition = 0;
    
        kafkaProducer.createTopics([topic], true, function (error, data) {
            if (!error) {
                
                heartBeat(kafkaProducer, partition, topic);
                heartBeatInterval = setInterval( function (producer, partition, topic) {
                    heartBeat(producer, partition, topic);
                }, interval, kafkaProducer, partition, topic );
                rulesUpdateNotifier.notify();
            }
        })
    })
};

exports.stop = function () {
    if ( heartBeatInterval != null ) {
        clearInterval(heartBeatInterval)
    }
}
