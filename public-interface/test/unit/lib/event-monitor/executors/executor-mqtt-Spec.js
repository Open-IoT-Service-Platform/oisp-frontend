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
var expect = require('expect.js'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    uuid = require('uuid'),
    Q = require('q'),
    executorMQTT = rewire('../../../../../lib/event-monitor/executors/executor-mqtt');

describe('executor-mqtt', function() {
    var MQTTConnectorMock,
        loggerMock,
        MqttBindingsMock,
        BrokerStub,
        callback,
        message = {
            type : "command",
            transport: "mqtt",
            content : {
                domainId: uuid.v4(),
                deviceId: 'deviceId',
                gatewayId: 'gatewayId',
                componentId: uuid.v4(),
                command: 'LED.v1.0',
                params: {
                    LED: 1
                }
            }
        },
        topic = 'device/' + message.content.gatewayId + '/control',
        config = {
            controlChannel: {
                mqtt : {
                    "127.0.0.1:1883": {
                        host: 'localhost',
                        port: 1883,
                        qos: 1,
                        retain: false,
                        secure: false,
                        retries: 30,
                        topic: "device/{gatewayId}/control",
                        username: "api_actuator",
                        password : "changeit"
                    }
                }
            }
        };

    beforeEach(function(){
        BrokerStub = {
            publish: sinon.stub()
        };
        MQTTConnectorMock = {
            Broker: function(){
                return BrokerStub;
            }
        };
        loggerMock = {
            debug: sinon.spy(),
            error: sinon.spy(),
            info: sinon.spy()
        };
        MqttBindingsMock = {
            find: sinon.stub(),
            TYPE:{
                MQTT:""
            }
        };
        callback = sinon.spy();

        executorMQTT.__set__('MQTTConnector', MQTTConnectorMock);
        executorMQTT.__set__('logger', loggerMock);
        executorMQTT.__set__('connectionBindings', MqttBindingsMock);

    });


    describe('execute', function () {
        it('should publish data to selected broker if device is connected via mqtt', function (done) {
            // prepare
            MqttBindingsMock.find.returns(Q.resolve({ deviceId: message.deviceId, broker: '127.0.0.1:1883' }));
            var localExecutorMQTT = executorMQTT(config);

            // execute
            localExecutorMQTT.execute(message, function(){
                // attest
                try{
                    expect(BrokerStub.publish.args[0][0]).to.equal(topic);
                    expect(BrokerStub.publish.args[0][1]).to.equal(message);
                    done();
                } catch(e){
                    done(e);
                }
            });
        });

        it('should not publish data if device is connected via mqtt to broker not specified in config', function (done) {
            // prepare
            MqttBindingsMock.find.returns(Q.resolve({ deviceId: message.deviceId, broker: 'non-existing-broker' }));
            var localExecutorMQTT = executorMQTT(config);

            // execute
            localExecutorMQTT.execute(message, function(){
                // attest
                expect(BrokerStub.publish.called).to.equal(false);
                done();
            });
        });

        it('should not publish data if device is not connected via mqtt', function (done) {
            // prepare
            MqttBindingsMock.find.returns(Q.resolve(null));
            var localExecutorMQTT = executorMQTT(config);

            // execute
            localExecutorMQTT.execute(message, function(){
                // attest
                expect(BrokerStub.publish.called).to.equal(false);
                done();
            });
        });

        it('should not publish data if db problem occured', function (done) {
            // prepare
            MqttBindingsMock.find.returns(Q.reject({ error: 'DB error' }));
            var localExecutorMQTT = executorMQTT(config);

            // execute
            localExecutorMQTT.execute(message, function(){
                // attest
                expect(BrokerStub.publish.called).to.equal(false);
                done();
            });
        });
    });
});
