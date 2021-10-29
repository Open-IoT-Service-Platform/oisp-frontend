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
    commandsManager = rewire('../../../../../engine/api/v1/commands'),
    errBuilder  = require("../../../../../lib/errorHandler").errBuilder,
    uuid = require('uuid');

var domainId = uuid.v4(),
    devices = [{
    domainId: domainId,
    deviceId: "device1",
    gatewayId: "gateway1",
    components: [{
        cid: "cid1",
        type: "actuator1.v1.0",
        deviceId: "device1",
        componentType: {
            command:{
                commandString:"",
                parameters:[{
                    name:"led",
                    values:"on,off"
                }]
            }
        }
    },{
        cid: "cid2",
        type: "actuator2.v1.0",
        deviceId: "device1",
        componentType: {
            command:{
                commandString:"",
                parameters:[{
                    name:"volume",
                    values:"1,2"
                }]
            }
        }
    }]
},{
    domainId: domainId,
    deviceId: "device2",
    gatewayId: "gateway2",
    components: [{
        cid: "cid3",
        type: "actuator3.v1.0",
        deviceId: "device2",
        componentType: {
            command:{
                commandString:"",
                parameters:[{
                    name:"led",
                    values:"on,off"
                }]
            }
        }
    },{
        cid: "cid4",
        type: "actuator2.v1.0",
        deviceId: "device2"
    }]
}];

var components = [{
    domainId: domainId,
    id: "actuator1.v1.0",
    command: {
        display: "option",
        commandString: "cmd_actuator1",
        "parameters": [{
            "name": "led",
            "values": "on,off"
        },{
            "name": "volume",
            "values": "1,2,3,4"
        },{
            "name": "temperature",
            "values": "50-60"
        },{
            "name": "reset",
            "values": "now"
        },{
            "name": "camera",
            "values": "A-B"
        }]
    }
},{
    domainId: domainId,
    id: "actuator2.v1.0",
    command: {
        display: "option",
        commandString: "cmd_actuator2",
        "parameters": [{
            "name": "open",
            "values": "yes,no"
        },{
            "name": "level",
            "values": "a,b,c"
        },{
            "name": "pressure",
            "values": "150-160"
        }]
    }
},{
    domainId: domainId,
    id: "actuator3.v1.0",
    command: {
        display: "option",
        commandString: "cmd_actuator3",
        "parameters": [{
            "name": "led",
            "values": "on,off"
        },{
            "name": "volume",
            "values": "1,2,3"
        },{
            "name": "temperature",
            "values": "0-100"
        }]
    }
}];

var actuations = [
    {
        id: uuid.v4(),
        created: '2014-12-23T09:41:19.614Z',
        deviceId: devices[0].deviceId,
        componentId: uuid.v4(),
        command: components[0].command.commandString,
        parameters: components[0].command.parameters
    },
    {
        id: uuid.v4(),
        created: '2014-12-23T09:41:19.614Z',
        deviceId: devices[0].deviceId,
        componentId: uuid.v4(),
        command: components[1].command.commandString,
        parameters: components[1].command.parameters
    }
];

var deviceMock = {
    findByComponentId: function(deviceComponentId, callback){
        var foundComponent;
        var result = devices.filter(function(device){
            return device.components.filter(function(component){
                if(component.cid === deviceComponentId[0]) {
                    foundComponent = component;
                    return true;
                } else {
                    return false;
                }
            }).length > 0;
        })[0];
        callback(null, foundComponent);
    },
    findByAccountIdAndComponentId: function(accountId, componentId, callback) {
        if(componentId === "anycomponent2"){
            callback(true);
        } else {
            callback(null, devices[0]);
        }

    }
};

var componentMock = {
    findById: function(type, domainId, callback){
        var result = components.filter(function(component){
            return component.id === type && component.domainId === domainId;
        })[0];
        callback(null, result);
    }
};



describe('commands api', function() {
    var actuationsMock, postgresProviderMock;
    describe('getCommands', function() {

        var dateFilterStub = {
            from: 0,
            to: Date.now()
        };

        var resolved,
            rejected,
            actuationsList;

        beforeEach(function () {
            actuationsMock = {
                findByDeviceId: sinon.stub().yields(null)
            };
            resolved = sinon.spy();
            rejected = sinon.spy();
            actuationsList = undefined;
        });

        it('should successfully respond with empty list of commands when there are no actuations commands registered for device', function (done) {
            commandsManager.__set__("Actuations", actuationsMock);

            commandsManager.getActuations(devices[0].deviceId, dateFilterStub)
                .then (function success(actuations) {
                    actuationsList = actuations;
                    resolved();
                })
                .catch (function error() {
                    rejected();
                }).finally (function () {
                    sinon.assert.calledOnce(resolved);
                    sinon.assert.calledOnce(actuationsMock.findByDeviceId);
                    sinon.assert.notCalled(rejected);
                    expect(actuationsList).to.be.equal(undefined);
                    done();
                });
        });

        it('should successfully respond with list of actuation commands', function (done) {
            actuationsMock = {
                findByDeviceId: sinon.stub().yields(null, actuations)
            };

            commandsManager.__set__("Actuations", actuationsMock);

            commandsManager.getActuations(devices[0].deviceId, dateFilterStub)
                .then (function success(actuations) {
                    actuationsList = actuations;
                    resolved();
                })
                .catch (function error() {
                    rejected();
                }).finally (function () {
                    sinon.assert.calledOnce(resolved);
                    sinon.assert.calledOnce(actuationsMock.findByDeviceId);
                    sinon.assert.notCalled(rejected);
                    expect(actuationsList.length).to.be.equal(2);
                    done();
                });
        });

        it('should respond with error when search actuations in DB fails', function (done) {
            var error = new Error('db error');
            actuationsMock = {
                findByDeviceId: sinon.stub().yields(error)
            };

            commandsManager.__set__("Actuations", actuationsMock);

            commandsManager.getActuations(devices[0].deviceId, dateFilterStub)
                .then (function success(actuations) {
                    actuationsList = actuations;
                    resolved();
                })
                .catch (function error() {
                    rejected();
                }).finally (function () {
                    sinon.assert.calledOnce(rejected);
                    sinon.assert.calledOnce(actuationsMock.findByDeviceId);
                    sinon.assert.notCalled(resolved);
                    expect(actuationsList).to.be.equal(undefined);
                    done();
                });
        });
    });
    describe('command', function() {
        beforeEach(function () {
            actuationsMock = {
                new: sinon.stub().callsArgWith(1, null)
            };
            postgresProviderMock = {
                complexCommands: {
                    findByAccountAndId: sinon.stub().callsArgWith(2, null, {commands:[]})
                }
            };
            commandsManager.__set__("postgresProvider", postgresProviderMock);
            commandsManager.__set__("Device", deviceMock);
            commandsManager.__set__("Actuations", actuationsMock);
        });

        it('should successfully sent a command with multiples values for multiples components that belong to different devices, even when devices have another components', function(done){
            // prepare
            var processSpy = sinon.spy();
            process.on("incoming_message", processSpy);

            // execute
            commandsManager.command(domainId, [
                    {
                        componentId: "cid1",
                        parameters: [
                            {
                                name: "led",
                                value: "on"
                            },
                            {
                                name: "led",
                                value: "off"
                            }
                        ]
                    },
                    {
                        componentId: "cid3",
                        parameters: [
                            {
                                name: "led",
                                value: "off"
                            },
                            {
                                name: "led",
                                value: "on"
                            }
                        ]
                    }
                ], [], function(){
                try{
                    // attest
                    sinon.assert.calledTwice(processSpy);
                    sinon.assert.calledTwice(actuationsMock.new);

                    process.removeListener("incoming_message", processSpy);
                    done();
                } catch(err){
                    done(err);
                }
            });


        });

        describe('complex commands', function() {
            var domain = domainId;
            var commandId = 'complex-1';
            var assert, processSpy;

            beforeEach(function() {
                processSpy = sinon.spy();
                process.on("incoming_message", processSpy);
                deviceMock.findByAccountIdAndComponentId = sinon.stub().callsArgWith(2, {});

                commandsManager.__set__("complexCommand", postgresProviderMock.complexCommands);
            });

            it('should send complex command', function(done){
                // prepare
                var devMock = {
                        findByAccountIdAndComponentId: sinon.stub().yields(null, devices[0])
                    },
                    command = {
                    "do_id": domain,
                    "id": commandId,
                    "commands": [
                        {
                            componentId: "cid1",
                            "transport": "mqtt",
                            parameters: [
                                {
                                    name: "led",
                                    value: "on"
                                },
                                {
                                    name: "led",
                                    value: "off"
                                }
                            ]
                        }]
                };

                postgresProviderMock.complexCommands.findByAccountAndId.withArgs(domain, commandId).yields(null, command);

                commandsManager.__set__("Device", devMock);
                // attest
                assert = function(err) {
                    try{
                        expect(err).to.equal(null);
                        sinon.assert.calledOnce(processSpy);
                        expect(processSpy.args[0][0].content.componentId).to.equal('cid1');

                        process.removeListener("incoming_message", processSpy);
                        done();
                    }catch(err){
                        done(err);
                    }
                };

                // execute
                commandsManager.command(domain, [], [commandId], assert)
            });

            it('should pass through a database error', function(done){
                // prepare
                var error = 'error';
                postgresProviderMock.complexCommands.findByAccountAndId.withArgs(domain, commandId).yields(error);

                // attest
                assert = function(err) {
                    expect(err).to.equal(error);
                    sinon.assert.notCalled(processSpy);

                    process.removeListener("incoming_message", processSpy);
                    done();
                };

                // execute
                commandsManager.command(domain, [], [commandId], assert);
            });

            it('should pass through a database error', function(done){
                // prepare
                var command = {
                    "do_id": domain,
                    "id": commandId,
                    "commands": [
                        {
                            componentId: "cid-nonexistent",
                            parameters: [
                                {
                                    name: "led",
                                    value: "on"
                                },
                                {
                                    name: "volume",
                                    value: "2"
                                }
                            ]
                        }]
                };

                postgresProviderMock.complexCommands.findByAccountAndId.withArgs(domain, commandId).yields(null, command);

                // attest
                assert = function(err) {
                    expect(err).not.to.equal(null);
                    sinon.assert.notCalled(processSpy);

                    process.removeListener("incoming_message", processSpy);
                    done();
                };

                // execute
                commandsManager.command(domain, [], [commandId], assert);

            });

        });

        it('should not sent messages when at least one component does not exists', function(done){
            // prepare
            var processSpy = sinon.spy();
            process.on("incoming_message", processSpy);

            // execute
            commandsManager.command(domainId, [
                    {
                        componentId: "cid1",
                        parameters: [
                            {
                                name: "led",
                                value: "on"
                            }
                        ]
                    },
                    {
                        componentId: "anycomponent2",
                        parameters: [
                            {
                                name: "led",
                                value: "on"
                            }
                        ]
                    }
                ], [], function(){
                try{
                    // attest
                    sinon.assert.notCalled(processSpy);
                    process.removeListener("incoming_message", processSpy);
                    done();
                }catch(err){
                    done(err);
                }
            });


        });

        it('should successfully sent more than one command for the same component', function(done){
            // prepare
            var processSpy = sinon.spy();
            process.on("incoming_message", processSpy);

            // execute
            commandsManager.command(domainId, [
                {
                    componentId: "cid2",
                    parameters: [
                        {
                            name: "led",
                            value: "on"
                        }]
                },{
                    componentId: "cid2",
                    parameters: [
                        {
                            name: "led",
                            value: "off"
                        }]
                }], [], function(){
                try{
                    // attest
                    sinon.assert.callCount(processSpy, 2);
                    sinon.assert.calledTwice(actuationsMock.new);

                    process.removeListener("incoming_message", processSpy);
                    done();
                } catch(err){
                    done(err);
                }
            });
        });

        it('should validate values are supported (range)', function(done){
            // prepare

            var processSpy = sinon.spy();
            process.on("incoming_message", processSpy);
            // execute
            commandsManager.command(domainId, [
                    {
                        componentId: "cid1",
                        parameters: [
                            {
                                name: "temperature",
                                value: "61"
                            }]
                    }], [], function(err){
                // attest
                expect(err.code).to.be.equal(errBuilder.Errors.ComponentCommands.InvalidValue.code);
                sinon.assert.notCalled(processSpy);

                process.removeListener("incoming_message", processSpy);
                done();
            });


        });

        it('should not sent message for any component when at least one value is not supported for some component', function(done){
            // prepare
            var processSpy = sinon.spy();
            process.on("incoming_message", processSpy);
            // execute
            commandsManager.command(domainId, [
                    {
                        componentId: "cid1",
                        parameters: [
                            {
                                name: "volume",
                                value: "4"
                            },
                            {
                                name: "led",
                                value: "on"
                            }
                        ]
                    },{
                        componentId: "cid3",
                        parameters: [
                            {
                                name: "volume",
                                value: "4"
                            },
                            {
                                name: "led",
                                value: "on"
                            }
                        ]
                    }], [], function(err){
                // attest
                expect(err.code).to.equal(errBuilder.Errors.ComponentCommands.InvalidValue.code);
                sinon.assert.notCalled(processSpy);

                process.removeListener("incoming_message", processSpy);
                done();
            });


        });
    });
});
