/**
 * Copyright (c) 2018 Intel Corporation
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
var kafka = require('kafka-node'),
    config = require('../config'),
    logger = require('../lib/logger').init(),


    kafkaConsumer,
    topic = config.drsProxy.kafka.topics.heartbeat.name,
    partition = 0,
    kafkaClient = new kafka.KafkaClient({kafkaHost: config.drsProxy.kafka.hosts}),
    kafkaOffset = new kafka.Offset(kafkaClient);

var getKafkaOffset = function(topic_, partition_, cb) {
    kafkaOffset.fetchLatestOffsets([topic_], function (error, offsets) {
        if (!error) {
            cb(offsets[topic_][partition_])
        }
        else {
            setTimeout( function() {
                getKafkaOffset(topic_, partition_, cb);
            }, 1000)
        }
    })
};

getKafkaOffset(topic, partition, function(offset) {
    if ( offset >= 0 ) {
        var topics = [{ topic: topic, offset: offset+1, partition: partition}]
        var options = { autoCommit: true, fromOffset: true};

        kafkaConsumer = new kafka.Consumer(kafkaClient, topics, options)

        var oispServicesToMonitor = process.argv.slice(2);
       
        kafkaConsumer.on('message', function (message) {
            if ( kafkaConsumer ) {
                console.log(message)
                var now = new Date().getTime();
                var i=0;
                for(i=0; i<oispServicesToMonitor.length; i++) {
                    if ( oispServicesToMonitor[i] != null && oispServicesToMonitor[i].trim() === message.value.trim() ) {
                        oispServicesToMonitor[i] = null;
                    }
                }
                for(i=0; i<oispServicesToMonitor.length; i++) {
                    if ( oispServicesToMonitor[i] != null ) {
                        break;
                    }
                }
                if ( i == oispServicesToMonitor.length ) {
                    kafkaConsumer.close(true);
                    kafkaConsumer = null;
                }
            }
        });
    }
    else {
        console.log("Cannot get Kafka offset ")
    }
});



