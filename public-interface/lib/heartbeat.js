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
    var topic = config.drsProxy.kafka.topics.heartbeat.name;
    var partition = 0;
    
    kafkaClient = new Kafka.KafkaClient({kafkaHost: config.drsProxy.kafka.hosts});

    kafkaProducer = new Kafka.HighLevelProducer(kafkaClient, { requireAcks: 1, ackTimeoutMs: 500 });    

    kafkaProducer.on('ready', function () {

        kafkaProducer.createTopics([topic], true, function (error, data) {
            if (!error) {
                var kafkaOffset = new Kafka.Offset(kafkaClient);
                    
                kafkaOffset.fetchLatestOffsets([topic], function (error, offsets) {
                    var offset = offsets ? offsets[topic][partition] : 0;
                    var topics = [{ topic: topic, offset: offset+1, partition: partition}]
                    var options = { autoCommit: true, fromOffset: true};

                    var kafkaConsumer = new Kafka.Consumer(kafkaClient, topics, options);

                    var servicesToMonitor = ['websocket-server', 'backend'];
                    var ready = false;
                    kafkaConsumer.on('message', function (message) {
                        if ( ready == false ) {
                            var i=0;
                            for(i=0; i<servicesToMonitor.length; i++) {
                                if ( servicesToMonitor[i] != null && servicesToMonitor[i].trim() === message.value.trim() ) {
                                  servicesToMonitor[i] = null;
                                }
                            }
                                
                            for(i=0; i<servicesToMonitor.length; i++) {
                                if ( servicesToMonitor[i] != null ) {
                                    break;
                                }
                            }

                            if ( i == servicesToMonitor.length ) {
                                ready = true;
                                var interval = parseInt(config.drsProxy.kafka.topics.heartbeat.interval);
                                
                                
                                heartBeat(kafkaProducer, partition, topic);
                                heartBeatInterval = setInterval( function (producer, partition, topic) {
                                    heartBeat(producer, partition, topic);
                                }, interval, kafkaProducer, partition, topic );

                                rulesUpdateNotifier.notify();
                            }
                        }
                    })
                })
            }
        })
    })
};

exports.stop = function () {
    if ( heartBeatInterval != null ) {
        clearInterval(heartBeatInterval)
    }
}
