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
    commandsHandler = rewire('../../../../../engine/handlers/v1/commands'),
    uuid = require('uuid'),
    httpStatuses = require('../../../../../engine/res/httpStatuses'),
    engineErrors = require('../../../../../engine/res/errors').Errors,
    Q = require('q');


describe('commands handler', function(){

    var req,
        res,
        next,
        commandsApiMock,
        devicesMock,
        responseCode;

    beforeEach(function() {
        res = {
            send: sinon.spy(),
            setHeader: sinon.spy(),
            status: function(code) {
                responseCode = code;
                return this;
            }
        };
        next = sinon.spy();

        commandsApiMock = {
            command: sinon.stub(),
            getActuations: sinon.stub(),
            getComplexCommands: sinon.stub(),
            addComplexCommand: sinon.stub(),
            updateComplexCommand: sinon.stub(),
            deleteComplexCommand: sinon.stub()
        };
        devicesMock = {
            getDevice: sinon.stub()
        };

        commandsHandler.__set__('commandsApi', commandsApiMock);
        //commandsHandler.__set__('devices', devicesMock);
    });

    var validateSendStatusOK = function () {
        expect(res.send.calledOnce).to.equal(true);
        expect(responseCode).to.equal(httpStatuses.OK.code);
    };

    var validateSendStatusDeleteOK = function () {
        expect(res.send.calledOnce).to.equal(true);
        expect(res.send.calledWith(httpStatuses.DeleteOK.message)).to.equal(true);
//        expect(res.send.args[0][0]).to.equal(httpStatuses.DeleteOK.code);
        expect(responseCode).to.equal(httpStatuses.DeleteOK.code);
    };

    var validateSendReturnsObject = function (object) {
        validateSendStatusOK();
        expect(res.send.calledWith(object)).to.equal(true);
    };

    var validateNextPropagatedError = function (error) {
        expect(res.send.called).to.equal(false);
        expect(next.calledOnce).to.equal(true);
        expect(next.args[0][0]).to.equal(error);
    };

    describe('command', function() {

        beforeEach(function() {
            req = {
                params: {
                    accountId: uuid.v4()
                },
                body: {
                    commands: [
                        {
                            componentId: uuid.v4(),
                            parameters: [
                                {
                                    name: 'LED',
                                    value: 1
                                }
                            ]
                        }
                    ],
                    complexCommands: [],
                    transport: 'websocket'
                }
            };
        });

        var validateCommandArgs = function () {
            expect(commandsApiMock.command.calledOnce).to.equal(true);
            expect(commandsApiMock.command.args[0].length).to.equal(4);
            expect(commandsApiMock.command.args[0][0]).to.equal(req.params.accountId);
            expect(JSON.stringify(commandsApiMock.command.args[0][1])).to.equal(JSON.stringify(req.body.commands));
            expect(JSON.stringify(commandsApiMock.command.args[0][2])).to.equal(JSON.stringify(req.body.complexCommands));
        };

        it('should execute provided basic command', function (done) {
            // prepare
            commandsApiMock.command.callsArgWith(3, null);

            // execute
            commandsHandler.command(req, res, next);

            // attest
            validateCommandArgs();
            validateSendStatusOK();

            done();
        });

        it('should execute provided complex command', function (done) {
            // prepare
            req.body.commands.commands = [];
            req.body.commands.complexCommands = [ 'complex' ];
            commandsApiMock.command.callsArgWith(3, null);

            // execute
            commandsHandler.command(req, res, next);

            // attest
            validateCommandArgs();
            validateSendStatusOK();

            done();
        });

        it('should report error when received from API', function (done) {
            // prepare
            var error = 'error';
            commandsApiMock.command.callsArgWith(3, error);

            // execute
            commandsHandler.command(req, res, next);

            // attest
            validateCommandArgs();
            validateNextPropagatedError(error);

            done();
        });

    });

    describe('getCommands', function() {

        var device, actuations;

        beforeEach(function() {
            req = {
                params: {
                    accountId: uuid.v4(),
                    deviceId: 'myDevice'
                },
                query: {
                    from: 1427456856026,
                    to: Date.now()
                }
            };
            device = {
                deviceId: req.params.deviceId
            };
            actuations = [
                {
                    name: 'LED',
                    value: 0
                }
            ];
            Q.longStackSupport = true;
        });

        var promiseReturningOutcome = function(result) {
            return Q.nfcall(function(callback){
                callback(null, result);
            });
        };

        var promiseReturningError = function(error) {
            return Q.nfcall(function(callback){
                callback(error);
            });
        };

        var validateGetDeviceArgs = function () {
            expect(devicesMock.getDevice.calledOnce).to.equal(true);
            expect(devicesMock.getDevice.args[0][0]).to.equal(req.params.deviceId);
            expect(devicesMock.getDevice.args[0][1]).to.equal(req.params.accountId);
        };

        var validateGetActuationsArgs = function () {
            expect(commandsApiMock.getActuations.calledOnce).to.equal(true);
            expect(commandsApiMock.getActuations.args[0][1]).to.equal(device.deviceId);
            expect(commandsApiMock.getActuations.args[0][2].from).to.equal(req.query.from);
            expect(commandsApiMock.getActuations.args[0][2].to).to.equal(req.query.to);
        };

        var expectError = function (expectedError) {
            expect(next.calledOnce).to.equal(true);
            expect(next.args[0][0].status).to.equal(expectedError.status);
            expect(next.args[0][0].code).to.equal(expectedError.code);
            expect(next.args[0][0].message).to.equal(expectedError.message);
            expect(res.send.called).to.equal(false);
        };

        describe('should report Invalid Request', function() {

            it('if accountId not provided', function (done) {
                // prepare
                delete req.params.accountId;

                // execute
                commandsHandler.getCommands(req, res, next);

                // attest
                expectError(engineErrors.Generic.InvalidRequest);

                done();
            });

            it('if deviceId not provided', function (done) {
                // prepare
                delete req.params.deviceId;

                // execute
                commandsHandler.getCommands(req, res, next);

                // attest
                expectError(engineErrors.Generic.InvalidRequest);

                done();
            });

            it('if both accountId and deviceId not provided', function (done) {
                // prepare
                delete req.params.accountId;
                delete req.params.deviceId;

                // execute
                commandsHandler.getCommands(req, res, next);

                // attest
                expectError(engineErrors.Generic.InvalidRequest);

                done();
            });

            it('if from exists but is not a number', function (done) {
                // prepare
                req.query.from = 'string';

                // execute
                commandsHandler.getCommands(req, res, next);

                // attest
                expectError(engineErrors.Generic.InvalidRequest);

                done();
            });

            it('if to exists but is not a number', function (done) {
                // prepare
                req.query.to = 'string';

                // execute
                commandsHandler.getCommands(req, res, next);

                // attest
                expectError(engineErrors.Generic.InvalidRequest);

                done();
            });

            it('if from exists but is not a number', function (done) {
                // prepare
                req.query.from = 'string';

                // execute
                commandsHandler.getCommands(req, res, next);

                // attest
                expectError(engineErrors.Generic.InvalidRequest);

                done();
            });

            it('if from to exist but they are not numbers', function (done) {
                // prepare
                req.query.from = 'string';
                req.query.to = 'string';

                // execute
                commandsHandler.getCommands(req, res, next);

                // attest
                expectError(engineErrors.Generic.InvalidRequest);

                done();
            });

        });

        it('should use 0 as from and no to when from not provided', function (done) {
            // prepare
            delete req.query.from;
            delete req.query.to;
            devicesMock.getDevice.yields(null, device);
            commandsApiMock.getActuations.returns(promiseReturningOutcome(actuations));
            // execute
            commandsHandler.getCommands(req, res, next).then(function() {
                // attest
                expect(commandsApiMock.getActuations.calledOnce).to.equal(true);
                expect(commandsApiMock.getActuations.args[0][1]).to.equal(device.deviceId);
                expect(commandsApiMock.getActuations.args[0][2].from).to.equal(0);
                expect(commandsApiMock.getActuations.args[0][2].to).to.equal(undefined);
                done();
            }).catch(function(err) {
                done(err);
            });
        });

        it('should send actuations found', function (done) {
            // prepare
            devicesMock.getDevice.yields(null, device);
            commandsApiMock.getActuations.returns(promiseReturningOutcome(actuations));

            // execute
            commandsHandler.getCommands(req, res, next).then(function() {
                // attest
                validateGetActuationsArgs();
                validateSendReturnsObject(actuations);
                done();
            }).catch(function(err) {
                done(err);
            });
        });


        it('should report error if actuation search failed', function (done) {
            // prepare
            var error = 'error';
            commandsApiMock.getActuations.returns(Q.reject(engineErrors.Actuation.SearchError));
            // execute
            commandsHandler.getCommands(req, res, next).then(function() {
                // attest
                expectError(engineErrors.Actuation.SearchError);

                done();
            }).catch(function(err) {
                done(err);
            });
        });

        it('should pass actuation search error if it has correct format', function (done) {
            // prepare
            var error = {
                status: 500,
                code: 500,
                message: 'Actuation Search failed'
            };
            devicesMock.getDevice.yields(null, device);
            commandsApiMock.getActuations.returns(promiseReturningError(error));

            // execute
            commandsHandler.getCommands(req, res, next).then(function() {
                // attest

                expectError(error);

                done();
            }).catch(function(err) {
                done(err);
            });
        });

    });

    describe('addComplexCommand', function() {

        beforeEach(function() {
            req = {
                params: {
                    accountId: uuid.v4(),
                    commandName: 'complex'
                },
                body: {
                    commands: [
                        {
                            componentId: uuid.v4(),
                            parameters: [
                                {
                                    name: 'LED',
                                    value: 1
                                },
                                {
                                    name: 'LED',
                                    value: 0
                                }
                            ]
                        }
                    ],
                    complexCommands: [],
                    transport: 'websocket'
                }
            };
        });

        var validateAddComplexCommandArgs = function () {
            expect(commandsApiMock.addComplexCommand.calledOnce).to.equal(true);
            expect(commandsApiMock.addComplexCommand.args[0].length).to.equal(4);
            expect(commandsApiMock.addComplexCommand.args[0][0]).to.equal(req.params.accountId);
            expect(commandsApiMock.addComplexCommand.args[0][1]).to.equal(req.params.commandName);
            expect(JSON.stringify(commandsApiMock.addComplexCommand.args[0][2])).to.equal(JSON.stringify(req.body.commands));
        };

        it('should create complex command from provided basic commands', function (done) {
            // prepare
            commandsApiMock.addComplexCommand.callsArgWith(3, null);

            // execute
            commandsHandler.addComplexCommand(req, res, next);

            // attest
            validateAddComplexCommandArgs();
            validateSendStatusOK();

            done();
        });

        it('should report error when received from API', function (done) {
            // prepare
            var error = 'error';
            commandsApiMock.addComplexCommand.callsArgWith(3, error);

            // execute
            commandsHandler.addComplexCommand(req, res, next);

            // attest
            validateAddComplexCommandArgs();
            validateNextPropagatedError(error);

            done();
        });
    });

    describe('getComplexCommands', function() {

        var commands;

        beforeEach(function() {
            req = {
                params: {
                    accountId: uuid.v4()
                }
            };
            commands = [
                {
                    componentId: uuid.v4(),
                    parameters: [
                        {
                            name: 'LED',
                            value: 1
                        },
                        {
                            name: 'LED',
                            value: 0
                        }
                    ]
                }
            ];
        });

        var validateGetComplexCommandsArgs = function() {
            expect(commandsApiMock.getComplexCommands.calledOnce).to.equal(true);
            expect(commandsApiMock.getComplexCommands.args[0].length).to.equal(2);
            expect(commandsApiMock.getComplexCommands.args[0][0]).to.equal(req.params.accountId);
        };

        it('should send found commands', function (done) {
            // prepare
            commandsApiMock.getComplexCommands.callsArgWith(1, null, commands);

            // execute
            commandsHandler.getComplexCommands(req, res, next);

            // attest
            validateGetComplexCommandsArgs();
            validateSendReturnsObject(commands);

            done();
        });

        it('should report error if received from API', function (done) {
            // prepare
            var error = 'error';
            commandsApiMock.getComplexCommands.callsArgWith(1, error);

            // execute
            commandsHandler.getComplexCommands(req, res, next);

            // attest
            validateGetComplexCommandsArgs();
            validateNextPropagatedError(error);

            done();
        });

        it('should survive received null value', function (done) {
            // prepare
            commandsApiMock.getComplexCommands.callsArgWith(1, null, null);

            // execute
            commandsHandler.getComplexCommands(req, res, next);

            // attest
            validateGetComplexCommandsArgs();
            validateSendReturnsObject(null);

            done();
        });

    });

    describe('updateComplexCommand', function() {

        beforeEach(function() {
            req = {
                params: {
                    accountId: uuid.v4(),
                    commandName: 'complex'
                },
                body: {
                    commands: [
                        {
                            componentId: uuid.v4(),
                            parameters: [
                                {
                                    name: 'LED',
                                    value: 1
                                },
                                {
                                    name: 'LED',
                                    value: 0
                                }
                            ]
                        }
                    ],
                    complexCommands: [],
                    transport: 'websocket'
                }
            };
        });

        var validateUpdateComplexCommandArgs = function () {
            expect(commandsApiMock.updateComplexCommand.calledOnce).to.equal(true);
            expect(commandsApiMock.updateComplexCommand.args[0].length).to.equal(4);
            expect(commandsApiMock.updateComplexCommand.args[0][0]).to.equal(req.params.accountId);
            expect(commandsApiMock.updateComplexCommand.args[0][1]).to.equal(req.params.commandName);
            expect(JSON.stringify(commandsApiMock.updateComplexCommand.args[0][2])).to.equal(JSON.stringify(req.body.commands));
        };

        it('should create complex command from provided basic commands', function (done) {
            // prepare
            commandsApiMock.updateComplexCommand.callsArgWith(3, null);

            // execute
            commandsHandler.updateComplexCommand(req, res, next);

            // attest
            validateUpdateComplexCommandArgs();
            validateSendStatusOK();

            done();
        });

        it('should report error when received from API', function (done) {
            // prepare
            var error = 'error';
            commandsApiMock.updateComplexCommand.callsArgWith(3, error);

            // execute
            commandsHandler.updateComplexCommand(req, res, next);

            // attest
            validateUpdateComplexCommandArgs();
            validateNextPropagatedError(error);

            done();
        });

    });

    describe('deleteComplexCommand', function() {

        beforeEach(function() {
            req = {
                params: {
                    accountId: uuid.v4(),
                    commandName: 'complex'
                }
            };
        });

        var validateDeleteComplexCommandArgs = function() {
            expect(commandsApiMock.deleteComplexCommand.calledOnce).to.equal(true);
            expect(commandsApiMock.deleteComplexCommand.args[0].length).to.equal(3);
            expect(commandsApiMock.deleteComplexCommand.args[0][0]).to.equal(req.params.accountId);
            expect(commandsApiMock.deleteComplexCommand.args[0][1]).to.equal(req.params.commandName);
        };

        it('should delete complex command provided', function (done) {
            // prepare
            commandsApiMock.deleteComplexCommand.callsArgWith(2, null);

            // execute
            commandsHandler.deleteComplexCommand(req, res, next);

            // attest
            validateDeleteComplexCommandArgs();
            validateSendStatusDeleteOK();

            done();
        });

        it('should report error if received from API', function (done) {
            // prepare
            var error = 'error';
            commandsApiMock.deleteComplexCommand.callsArgWith(2, error);

            // execute
            commandsHandler.deleteComplexCommand(req, res, next);

            // attest
            validateDeleteComplexCommandArgs();
            validateNextPropagatedError(error);

            done();
        });

    });

});
