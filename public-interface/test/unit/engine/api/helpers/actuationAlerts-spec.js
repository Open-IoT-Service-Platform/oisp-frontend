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


var expect = require('expect.js'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    actuationAlerts = rewire('../../../../../engine/api/helpers/actuationAlerts'),
    uuid = require('node-uuid'),
    Q = require('q');


describe("Actuation alerts", function () {

    var complexCommandMock,
        deviceMock,
        complexCommandStub,
        ruleWithoutActuationStub,
        ruleOnlyWithActuationStub,
        deviceStub,
        componentStub,
        httpBindingStub,
        websocketBindingStub,
        mqttBindingStub,
        actuationMock,
        connectionBindingsMock,
        resolved,
        rejected,
        DEVICE_ID = 'deviceId',
        GATEWAY_ID = 'gatewayId',
        ACTION_TYPE_MAIL = 'mail',
        ACTION_TYPE_HTTP = 'http',
        ACTION_TYPE_ACTUATION = 'actuation',
        NOTIFICATION_EMAIL = 'test@example.com',
        NOTIFICATION_ENDPOINT = 'test.example.com',
        COMPLEX_COMMAND_ID1 = 'command1',
        COMMAND_STRING = 'LED.v1.0',
        PARAM = {
            name: 'LED',
            values: '1'
        },
        accountId1 = uuid.v4(),
        accountId2 = uuid.v4(),
        componentId1 = uuid.v4();



    function prepareStubs () {

        componentStub = {
            id: componentId1,
            domainId: accountId1,
            componentType:{
                command: {
                    commandString: COMMAND_STRING,
                    parameters: [
                        {
                            "name": PARAM.name,
                            "values": PARAM.values
                        }
                    ]
                }
            }
        };

        deviceStub = {
            "deviceId": DEVICE_ID,
            "gatewayId": GATEWAY_ID,
            "domainId": accountId1,
            "components": [
                componentStub
            ]
        };

        complexCommandStub = {
            "accountId" : accountId1,
            "id" : COMPLEX_COMMAND_ID1,
            "commands" : [
                { 	"componentId" : componentId1,
                    "parameters" :
                        [
                            {
                                "name": PARAM.name,
                                "values": PARAM.values
                            }
                        ]
                }
            ]
        };

        ruleWithoutActuationStub = {
            actions: [
                {
                    "type" : ACTION_TYPE_MAIL,
                    "target" : [  NOTIFICATION_EMAIL ]
                },
                {
                    "type" : ACTION_TYPE_HTTP,
                    "target" : [  NOTIFICATION_ENDPOINT ]
                }
            ]
        };

        ruleOnlyWithActuationStub = {
            actions: [
                {
                    "type" : ACTION_TYPE_ACTUATION,
                    "target" : [  COMPLEX_COMMAND_ID1 ]
                }
            ]
        };

        httpBindingStub = {
            _id : DEVICE_ID,
             type: "http"
        };

        websocketBindingStub = {
            _id : DEVICE_ID,
            lastConnectedAt: 1421840797534
        };

        mqttBindingStub = {
            _id : DEVICE_ID,
            lastConnectedAt: 1421840797535
        }
    }

    function prepareMocks() {
        complexCommandMock = {
            findByAccountAndId: sinon.stub().yields(null, complexCommandStub)
        };
        deviceMock = {
            findByAccountIdAndComponentId: sinon.stub().yields(null, deviceStub)
        };

        actuationMock = {
            new: sinon.stub().callsArgWith(1, null)
        };

        connectionBindingsMock = {
            find: sinon.stub().returns(Q.resolve(websocketBindingStub)),
            findLatestConnection: sinon.stub().returns(Q.resolve(httpBindingStub))
        };
    }

    beforeEach (function () {
        prepareStubs();
        prepareMocks();
        resolved = sinon.spy();
        rejected = sinon.spy();
    });

    describe("Save actuations, which will be send from alert", function() {

        it('Should not add new actuations', function (done) {

            actuationAlerts.__set__('Actuations', actuationMock);

            actuationAlerts.saveAlertActuations(ruleWithoutActuationStub.actions, function (err) {
                expect(err).to.be.equal(null);
                expect(actuationMock.new.notCalled).to.be.equal(true);
                done();
            });
        });

        it('Should add new actuation', function (done) {
            var resolved = sinon.spy();
            var rejected = sinon.spy();

            actuationAlerts.__set__('Actuations', actuationMock);
            actuationAlerts.__set__('ComplexCommand', complexCommandMock);
            actuationAlerts.__set__('Device', deviceMock);
            actuationAlerts.__set__('connectionBindings', connectionBindingsMock);

            actuationAlerts.addCommandsToActuationActions(accountId1, ruleOnlyWithActuationStub)
                .then(function success() {
                    resolved();
                }, function error(err) {
                    rejected();
                })
                .finally (function () {
                    actuationAlerts.saveAlertActuations(ruleOnlyWithActuationStub.actions, function (err) {
                        expect(resolved.calledOnce).to.be.equal(true);
                        expect(rejected.notCalled).to.be.equal(true);
                        expect(err).to.be.equal(null);
                        expect(actuationMock.new.calledOnce).to.be.equal(true);
                        done();
                    });
            });
        });
    });

    describe("Add commands to actuation alert action", function () {

        it('Should not add any command to action', function (done) {

            actuationAlerts.addCommandsToActuationActions(accountId1, ruleWithoutActuationStub)
                .then(function success() {
                    resolved();
                }, function error() {
                    rejected();
                })
                .finally (function () {
                    expect(resolved.calledOnce).to.be.equal(true);
                    expect(rejected.notCalled).to.be.equal(true);
                    for (var i = 0; i < ruleWithoutActuationStub.actions.length; i ++) {
                        expect(ruleWithoutActuationStub.actions[i].messages).to.be.equal(undefined);
                    }
                    done();
            })
        });

        it('Should not add any command to action if there are no information about device connection status', function (done) {

            complexCommandMock.findByAccountAndId = sinon.stub().yields(null, complexCommandStub);
            deviceMock.findByAccountIdAndComponentId = sinon.stub().yields(null, deviceStub);
            connectionBindingsMock.findLatestConnection = sinon.stub().returns(Q.resolve(null));

            actuationAlerts.__set__('ComplexCommand', complexCommandMock);
            actuationAlerts.__set__('Device', deviceMock);
            actuationAlerts.__set__('connectionBindings', connectionBindingsMock);

            actuationAlerts.addCommandsToActuationActions(accountId1, ruleOnlyWithActuationStub)
                .then(function success() {
                    resolved();
                }, function error(err) {
                    rejected();
                })
                .finally (function () {
                    expect(resolved.calledOnce).to.be.equal(true);
                    expect(rejected.notCalled).to.be.equal(true);
                    for (var i = 0; i < ruleOnlyWithActuationStub.actions.length; i ++) {
                        expect(ruleOnlyWithActuationStub.actions[i].messages.length).to.be.equal(0);
                    }
                    done();
                })
        });

        it('Should add command message to action', function (done) {

            var MESSAGE_TYPE_COMMAND = "command";

            complexCommandMock.findByAccountAndId = sinon.stub().yields(null, complexCommandStub);
            deviceMock.findByAccountIdAndComponentId = sinon.stub().yields(null, deviceStub);

            actuationAlerts.__set__('ComplexCommand', complexCommandMock);
            actuationAlerts.__set__('Device', deviceMock);
            actuationAlerts.__set__('connectionBindings', connectionBindingsMock);

            actuationAlerts.addCommandsToActuationActions(accountId1, ruleOnlyWithActuationStub)
                .then(function success() {
                    resolved();
                }, function error(err) {
                    rejected();
                })
                .finally (function () {
                    expect(resolved.calledOnce).to.be.equal(true);
                    expect(rejected.notCalled).to.be.equal(true);
                    for (var i = 0; i < ruleOnlyWithActuationStub.actions.length; i ++) {
                        var message = ruleOnlyWithActuationStub.actions[i].messages[0];
                        var content = message.content;
                        expect(message).to.not.be.equal(undefined);
                        expect(content).to.not.be.equal(undefined);
                        expect(message.type).to.be.equal(MESSAGE_TYPE_COMMAND);
                        expect(content.domainId).to.be.equal(accountId1);
                        expect(content.deviceId).to.be.equal(deviceStub.deviceId);
                        expect(content.gatewayId).to.be.equal(deviceStub.gatewayId);
                        expect(content.componentId).to.be.equal(componentStub.id);
                        expect(content.command).to.be.equal(componentStub.componentType.command.commandString);
                        expect(content.params[0].values).to.be.equal(PARAM.values);
                        expect(content.params[0].name).to.be.equal(PARAM.name);
                    }
                    done();
            })
        });
    })
});
