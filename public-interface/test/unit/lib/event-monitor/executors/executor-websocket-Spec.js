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
    config = require('../../../../../config.js'),
    Q = require('q'),
    executorWS = rewire('../../../../../lib/event-monitor/executors/executor-ws');

describe('executor-ws', function() {
    var WSConnectorMock,
        loggerMock,
        WebsocketBindingsMock,
        WSStub,
        callback,
        message = {
            type : "command",
            transport: "ws",
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
        };

    beforeEach(function(){
        WSStub = {
            publish: sinon.spy()
        };
        WSConnectorMock = {
            WebSocketClient: function(){
                return WSStub;
            }
        };
        loggerMock = {
            debug: sinon.spy(),
            error: sinon.spy(),
            info: sinon.spy()
        };
        WebsocketBindingsMock = {
            find: sinon.stub(),
            TYPE:{
                WEBSOCKET:""
            }
        };
        callback = sinon.spy();

        executorWS.__set__('WSConnector', WSConnectorMock);
        executorWS.__set__('logger', loggerMock);
        executorWS.__set__('connectionBindings', WebsocketBindingsMock);
    });

    describe('execute', function () {
        it('should publish data to selected broker if device is connected via ws', function (done) {
            // prepare
            WebsocketBindingsMock.find.returns(Q.resolve({ deviceId: message.deviceId, server: '127.0.0.1:8080' }));
            var localExecutorWS = executorWS(config);

            // execute
            localExecutorWS.execute(message, function(){
                // attest
                try{
                    expect(WSStub.publish.args[0][0]).to.be.equal(message);
                    done();
                } catch(e){
                    done(e);
                }
            });


        });


        it('should not publish data if device is not connected via ws', function (done) {
            // prepare
            WebsocketBindingsMock.find.returns(Q.resolve(null));
            var localExecutorWS = executorWS(config);

            // execute
            localExecutorWS.execute(message, function(){
                // attest
                expect(WSStub.publish.called).to.be.equal(false);
                done();
            });


        });

        it('should not publish data if db problem occured', function (done) {
            // prepare
            WebsocketBindingsMock.find.returns(Q.reject({ error: 'DB error' }));
            var localExecutorWS = executorWS(config);

            // execute
            localExecutorWS.execute(message, function(){
                // attest
                expect(WSStub.publish.called).to.be.equal(false);
                done();
            });

        });
    });
});
