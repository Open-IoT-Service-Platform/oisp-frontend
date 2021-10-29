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
    engineErrors = require('../../../../../engine/res/errors').Errors,
    httpStatuses = require('../../../../../engine/res/httpStatuses'),
    errBuilder  = require("../../../../../lib/errorHandler/index").errBuilder,
    schemas = require('../../../../../lib/schema-validator/schemas'),
    uuid = require('uuid'),
    Q = require('q'),
    devicesHandler = rewire('../../../../../engine/handlers/v1/devices');



describe('devices handler', function(){

    var req, res, next, responseCode;

    beforeEach(function() {
        req = {
            iotDomain: {
                id: uuid.v4()
            },
            params: {
                accountId: uuid.v4()
            },
            body: {},
            query: {},
            url: '/v1/api/shortPath'
        };
        res = {
            send: sinon.stub(),
            status: function(code) {
                responseCode = code;
                return this;
            }
        };
        next = sinon.stub();
        responseCode = null;
    });

    var expectResponseCode = function (code, body) {
        expect(res.send.calledOnce).to.equal(true);
        expect(responseCode).to.eql(code);
        if (body) {
            expect(res.send.calledWith(body)).to.equal(true);
        }
    };

    var expectOkResponse = function(body) {
        expectResponseCode(httpStatuses.OK.code);
        if (body) {
            expect(res.send.calledWith(body)).to.equal(true);
        }
    };

    var expectCreatedResponse = function(body) {
        expectResponseCode(httpStatuses.Created.code);
        if (body) {
            expect(res.send.calledWith(body)).to.equal(true);
        }
    };

    describe('usage', function(){
        it('should respond 200', function(done){
            // prepare
            res.setHeader = sinon.spy();

            // execute
            devicesHandler.usage(req, res, next);

            // attest
            expectOkResponse();
            expect(res.setHeader.calledWith('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')).to.equal(true);

            done();
        });
    });

    describe('get devices', function(){
        it('should return a list of devices', function(done){
            // prepare
            var devicesBizMock = {},
                devices = [{deviceId: 1}, {deviceId: 2}];

            var accId = uuid.v4();
            req.params.accounts = {};
            req.params.accounts[accId] = {};
            devicesBizMock.getDevices = sinon.stub().callsArgWith(2, null, devices);
            devicesHandler.__set__('devices', devicesBizMock);
            req.identity = 1;
            // execute
            devicesHandler.getDevices(req, res, next);
            // attest
            expectOkResponse(devices);

            done();
        });

        it('should return error if not authorized', function(done){
            // prepare
            delete req.params.accountId;
            // execute
            devicesHandler.getDevices(req, res, next);
            // attest
            expect(next.calledOnce).to.equal(true);
            expect(next.getCall(0).args[0].code).to.equal(errBuilder.Errors.Generic.NotAuthorized.code);

            done();
        });
    });

    describe('get device', function(){
        it('should return a device', function(done){
            // prepare
            var device = {deviceId: 1},
                mock = {
                    getDevice: sinon.stub().callsArgWith(2, null, device)
                };
            delete req.params.accountId;
            var accId = uuid.v4();
            req.accounts = {};
            req.accounts[accId] = {};
            devicesHandler.__set__('devices', mock);
            req.params = {accountId: 1, deviceId: 1};
            req.identity = 1;
            // execute
            devicesHandler.getDevice(req, res, next);
            // attest
            expectOkResponse(device);

            done();
        });

        it('should return error if not authorized', function(done){
            // prepare
            delete req.params.accountId;
            // execute
            devicesHandler.getDevice(req, res, next);
            // attest
            expect(next.calledOnce).to.equal(true);
            expect(next.getCall(0).args[0].code).to.equal(errBuilder.Errors.Generic.NotAuthorized.code);

            done();
        });

        it('should return an error when a device not exists', function(done){
            // prepare
            var error = new Error('device not found'),
                mock = {
                    getDevice: sinon.stub().callsArgWith(2, error, null)
                },
                nextMock = sinon.spy();

            devicesHandler.__set__('devices', mock);
            req.params = {accountId: uuid.v4(), deviceId: 1};
            // execute
            devicesHandler.getDevice(req, res, nextMock);
            // attest
            expect(nextMock.calledWith(error)).to.equal(true);

            done();
        });
    });

    describe('add device', function(){
        it('should add device if it is not exist', function(done){
            // prepare
            var device = { deviceId: 1 },
                mock = {
                    addDevice: sinon.stub().callsArgWith(2, null, device)
                },
                attributesValidationMock = {
                    checkLimitsForAttributes: sinon.stub().callsArgWith(1, null)
                };


            var accId = uuid.v4();
            req.params.accounts = {};
            req.params.accounts[accId] = {};

            devicesHandler.__set__('devices', mock);
            devicesHandler.__set__('attributesValidation', attributesValidationMock);
            req.body = device;
            // execute
            devicesHandler.addDevice(req, res, {});
            // attest
            expectCreatedResponse(device);

            done();
        });

        it('should return error if not authorized', function(done){
            // prepare
            delete req.params.accountId;
            // execute
            devicesHandler.addDevice(req, res, next);
            // attest
            expect(next.calledOnce).to.equal(true);
            expect(next.getCall(0).args[0].code).to.equal(errBuilder.Errors.Generic.NotAuthorized.code);

            done();
        });

        it('should not add device if it is duplicated', function(done){
            // prepare
            var device = { deviceId: 1 },
                error = new Error(409),
                mock = {
                    addDevice: sinon.stub().callsArgWith(2, error)
                },
                attributesValidationMock = {
                    checkLimitsForAttributes: sinon.stub().callsArgWith(1, null)
                },
                nextSpy = sinon.spy();

            devicesHandler.__set__('devices', mock);
            devicesHandler.__set__('attributesValidation', attributesValidationMock);
            req.body = device;
            // execute
            devicesHandler.addDevice(req, {}, nextSpy);
            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);

            done();
        });

        it('should pass error from attributes validation if it failed', function(done){
            // prepare
            var device = { deviceId: 1, attributes: { 'key': '' } },
                attributesValidationErrors = [ 'Error'],
                attributesValidationMock = {
                    checkLimitsForAttributes: sinon.stub().callsArgWith(1, attributesValidationErrors)
                },
                nextSpy = sinon.spy();

            devicesHandler.__set__('attributesValidation', attributesValidationMock);
            req.body = device;
            // execute
            devicesHandler.addDevice(req, {}, nextSpy);
            // attest
            expect(nextSpy.calledOnce).to.equal(true);
            expect(nextSpy.args[0][0].code).to.equal(httpStatuses.BadRequest.code);
            expect(nextSpy.args[0][0].errors).to.equal(attributesValidationErrors);

            done();
        });
    });

    describe('update device', function(){
        it('should update device if exists', function(done){
            // prepare
            var device = { deviceId: 1 },
                mock = {
                    updateDevice: sinon.stub().returns(Q.resolve(device))
                },
                attributesValidationMock = {
                    checkLimitsForAttributes: sinon.stub().yields(null)
                };

            var accId = uuid.v4();
            req.params.accounts = {};
            req.params.accounts[accId] = {};
            devicesHandler.__set__('devices', mock);
            devicesHandler.__set__('attributesValidation', attributesValidationMock);
            req.body = device;
            req.params = { accountId: '1', deviceId: device.deviceId};
            // execute
            devicesHandler.updateDevice(req, res, next)
                .done(function() {
                    // attest
                    expectOkResponse(device);
                    done();
                });
        });

        it('should return error if not authorized', function(done){
            // prepare
            delete req.params.accountId;
            // execute
            devicesHandler.updateDevice(req, res, next);
            // attest
            expect(next.calledOnce).to.equal(true);
            expect(next.getCall(0).args[0].code).to.equal(errBuilder.Errors.Generic.NotAuthorized.code);

            done();
        });

        it('should not update if it not exists', function(done){
            // prepare
            var error = new Error(404),
                device = { deviceId: 1 },
                mock = {
                    updateDevice: sinon.stub().rejects(error)
                },
                attributesValidationMock = {
                    checkLimitsForAttributes: sinon.stub().yields(null)
                },
                nextSpy = sinon.spy();
            devicesHandler.__set__('devices', mock);
            devicesHandler.__set__('attributesValidation', attributesValidationMock);
            req.body = device;
            req.params = {accountId: uuid.v4(), deviceId: device.deviceId};
            // execute
            devicesHandler.updateDevice(req, {}, nextSpy)
                .done(function() {
                    // attest
                    expect(nextSpy.calledWith(error)).to.equal(true);
                    done();
                });
        });

        it('should pass error from attributes validation if it failed', function(done){
            // prepare
            var device = { deviceId: 1, attributes: { 'key': '' } },
                attributesValidationErrors = [ 'Error'],
                attributesValidationMock = {
                    checkLimitsForAttributes: sinon.stub().yields(attributesValidationErrors)
                },
                nextSpy = sinon.spy();

            devicesHandler.__set__('attributesValidation', attributesValidationMock);
            req.body = device;
            req.params = {accountId: uuid.v4(), deviceId: device.deviceId};
            // execute
            devicesHandler.updateDevice(req, {}, nextSpy)
                .done(function() {
                    // attest
                    expect(nextSpy.calledOnce).to.equal(true);
                    expect(nextSpy.args[0][0].code).to.equal(httpStatuses.BadRequest.code);
                    expect(nextSpy.args[0][0].errors).to.equal(attributesValidationErrors);

                    done();
                });
        });
    });

    describe('delete device', function(){
        it('should return 204 http code when deleting an existing device', function(done){
            // prepare
            var mock = {
                    deleteDevice: sinon.stub().callsArgWith(2, null)
                };
            delete req.params.accountId;
            var accId = uuid.v4();
            req.accounts = {};
            req.accounts[accId] = {};
            devicesHandler.__set__('devices', mock);
            req.params = {deviceId: 1, accountId: uuid.v4()};
            // execute
            devicesHandler.deleteDevice(req, res, {});
            // attest
            expectResponseCode(httpStatuses.DeleteOK.code);

            done();
        });

        it('should return an 404 error code when the device does not exist', function(done){
            // prepare
            var error = new Error(404),
                mock = {
                    deleteDevice: sinon.stub().callsArgWith(2, error)
                },
                nextSpy = sinon.spy();
            devicesHandler.__set__('devices', mock);
            req.params = {deviceId: 1, accountId: uuid.v4()};

            devicesHandler.deleteDevice(req, {}, nextSpy);
            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);

            done();
        });
    });

    describe('delete component', function(){
        it('should delete a component if exists', function(done){
            // prepare
            var mock = {
                    deleteComponent: sinon.stub().returns(Q.resolve())
                },
                nextMock = sinon.spy();
            devicesHandler.__set__('devices', mock);
            req.params = {accountId: uuid.v4(), deviceId: 1, componentId: 1};
            // execute
            devicesHandler.deleteComponent(req, res, nextMock)
                .done(function() {
                    // attest
                    expectResponseCode(httpStatuses.DeleteOK.code);
                    expect(nextMock.calledOnce).to.equal(false);

                    done();
                });
        });

        it('should return an error something wrong happens when deleting the component', function(done){
            // prepare
            var error = new Error('crash'),
                mock = {
                    deleteComponent: sinon.stub().returns(Q.reject(error))
                },
                nextSpy = sinon.spy();
            devicesHandler.__set__('devices', mock);
            req.params = {accountId: uuid.v4(), deviceId: 1, componentId: 1};
            // execute
            devicesHandler.deleteComponent(req, {}, nextSpy)
                .done(function() {
                    // attest
                    expect(nextSpy.calledWith(error)).to.equal(true);

                    done();
                });
        });
    });

    describe('search devices', function(){
        it('should search devices if they match the criteria', function(done){
            // prepare
            var filters = {
                    criteria: []
                },
                searchResult = {devices: [], metrics: []},
                mock = {
                    findByCriteria: sinon.stub().callsArgWith(2, null, searchResult)
                };
            devicesHandler.__set__('devices', mock);
            req.body = filters;
            // execute
            devicesHandler.searchDevices(req, res, {});
            // attest
            expectOkResponse(searchResult);

            done();
        });

        it('should return 404 error code if none devices match the search criteria', function(done){
            // prepare
            var error = new Error(404),
                filters = {
                    criteria: []
                },
                mock = {
                    findByCriteria: sinon.stub().callsArgWith(2, error)
                },
                nextSpy = sinon.spy();
            devicesHandler.__set__('devices', mock);
            req.body = filters;
            // execute
            devicesHandler.searchDevices(req, {}, nextSpy);
            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);

            done();
        });
    });

    describe('get tags', function(){
        it('should return the available tags', function(done){
            // prepare
            var tags = ['arg', 'jujuy'],
                mock = {
                    getTags: sinon.stub().callsArgWith(1, null, tags)
                };
            devicesHandler.__set__('devices', mock);
            // execute
            devicesHandler.getTags(req, res, {});
            // attest
            expectOkResponse(tags);

            done();
        });

        it('should return 404 error code if no tags available', function(done){
            // prepare
            var error = new Error(404),
                mock = {
                    getTags: sinon.stub().callsArgWith(1, error)
                },
                nextSpy = sinon.spy();
            devicesHandler.__set__('devices', mock);
            // execute
            devicesHandler.getTags(req, {}, nextSpy);
            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);

            done();
        });
    });

    describe('get attributes', function(){
        it('should return attributes if everything is ok', function(done){
            //prepare
            var result = {
                    attributes:[]
                },
                apiDevicesMock = {
                    getAttributes: sinon.stub().callsArgWith(1, null, result)
                };
            devicesHandler.__set__('devices', apiDevicesMock);
            //execute
            devicesHandler.getAttributes(req, res, next);
            //attest
            expectOkResponse();

            done();
        });

        it('should not return attributes if something crashes', function(done){
            //prepare
            var error = errBuilder.Errors.Generic.InternalServerError,
                apiDevicesMock = {
                    getAttributes: sinon.stub().callsArgWith(1, error, null)
                };
            devicesHandler.__set__('devices', apiDevicesMock);
            //execute
            devicesHandler.getAttributes(req, res, next);
            //attest
            expect(next.calledOnce).to.equal(true);

            expect(next.getCall(0).args[0].code).to.equal(error.code);

            done();
        });
    });

    describe('register device', function(){
        it('should register device if everything is ok', function(done){
            //prepare
            req.body = {
                device: {}
            };
            var result = {
                    deviceId: 'deviceId'
                },
                apiDevicesMock = {
                    registerDevice: sinon.stub().callsArgWith(2, null, result)
                };
            devicesHandler.__set__('devices', apiDevicesMock);
            //execute
            devicesHandler.registerDevice(req, res, next);
            //attest
            expectOkResponse();

            done();
        });

        it('should not register device if something crashes', function(done){
            //prepare
            var error = errBuilder.Errors.Generic.InternalServerError,
                apiDevicesMock = {
                    registerDevice: sinon.stub().callsArgWith(2, error, null)
                };

            req.body = {
                device: {}
            };

            devicesHandler.__set__('devices', apiDevicesMock);
            //execute
            devicesHandler.registerDevice(req, res, next);
            //attest
            expect(next.calledOnce).to.equal(true);
            expect(next.getCall(0).args[0].code).to.equal(error.code);

            done();
        });
    });

    describe('count devices', function(){
        it('should return count if everything is ok', function(done){
            //prepare
            var result = 10,
                apiDevicesMock = {
                    countByCriteria: sinon.stub().callsArgWith(2, null, result)
                };
            devicesHandler.__set__('devices', apiDevicesMock);
            //execute
            devicesHandler.countDevices(req, res, next);
            //attest
            expectOkResponse();

            done();
        });

        it('should not return count if something crashes', function(done){
            //prepare
            var error = errBuilder.Errors.Generic.InternalServerError,
                apiDevicesMock = {
                    countByCriteria: sinon.stub().callsArgWith(2, error, null)
                };
            devicesHandler.__set__('devices', apiDevicesMock);
            //execute
            devicesHandler.countDevices(req, res, next);
            //attest
            expect(next.calledOnce).to.equal(true);
            expect(next.getCall(0).args[0].code).to.equal(error.code);

            done();
        });
    });

    describe('add component', function(){

        var validateNextPassedError = function (error) {
            expect(next.calledOnce).to.equal(true);
            expect(next.args[0].length).to.equal(1);
            expect(next.args[0][0].status).to.equal(error.status);
            expect(next.args[0][0].code).to.equal(error.code);
        };

        describe('single', function() {

            var validateSingleSchemaChosen = function (schemaValidatorMock) {
                expect(schemaValidatorMock.validateSchema.calledOnce).to.equal(true);
                expect(JSON.stringify(schemaValidatorMock.validateSchema.args[0][0])).to.equal(JSON.stringify(schemas.deviceComponent.SINGLE));
            };

            it('should validate schema for SINGLE if object passed in body', function(done){
                // prepare
                var component = {
                        cid: '01',
                        name: 'n01',
                        type: 't01'
                    },
                    schemaValidatorMock = {
                        validateSchema: sinon.stub().returns(function(){})
                    };
                devicesHandler.__set__('schemaValidator', schemaValidatorMock);
                req.body = component;
                req.params = {accountId: uuid.v4(), deviceId: 1};
                req.identity = uuid.v4();
                // execute
                devicesHandler.addComponents(req, res, next);
                // attest
                validateSingleSchemaChosen(schemaValidatorMock);
                expect(next.called).to.equal(false);

                done();
            });

            it('should add component if it does not exist', function(done){
                // prepare
                var component = {
                        cid: '01',
                        name: 'n01',
                        type: 't01'
                    },
                    mock = {
                        addComponents: sinon.stub().returns(Q.resolve(component))
                    },
                    schemaValidatorMock = {
                        validateSchema: sinon.stub().returns(function(a,b,c){c();})
                    },
                    id = uuid.v4();
                devicesHandler.__set__('schemaValidator', schemaValidatorMock);
                devicesHandler.__set__('devices', mock);
                req.body = component;
                req.params = {accountId: uuid.v4(), deviceId: id};
                req.identity = id;
                req.headers = [{authorization : {}}];
                // execute
                devicesHandler.addComponents(req, res, function(){
                    // attest
                    expectCreatedResponse(component);
                });


                done();
            });

            it('should add component if not authorized', function(done){
                // prepare
                delete req.params.accountId;
                var component = {
                        cid: '01',
                        name: 'n01',
                        type: 't01'
                    },
                    schemaValidatorMock = {
                        validateSchema: sinon.stub().returns(function(a,b,c){c();})
                    };
                devicesHandler.__set__('schemaValidator', schemaValidatorMock);
                req.body = component;
                req.identity = uuid.v4();
                req.headers = {};
                // execute
                devicesHandler.addComponents(req, res, next);
                // attest
                expect(next.calledOnce).to.equal(true);
                expect(next.getCall(0).args[0].code).to.equal(errBuilder.Errors.Generic.NotAuthorized.code);

                done();
            });

            it('should add component if identity is not equal deviceId', function(done) {
                // prepare
                req.params.deviceId = 'myDevice';
                var component = {
                        cid: '01',
                        name: 'n01',
                        type: 't01'
                    },
                    schemaValidatorMock = {
                        validateSchema: sinon.stub().returns(function (a, b, c) {
                            c();
                        })
                    };
                devicesHandler.__set__('schemaValidator', schemaValidatorMock);
                req.body = component;
                req.identity = uuid.v4();
                req.headers = [{authorization : {}}];
                // execute
                devicesHandler.addComponents(req, res, next);
                // attest
                expect(next.calledOnce).to.equal(true);
                expect(next.getCall(0).args[0].code).to.equal(errBuilder.Errors.Generic.NotAuthorized.code);

                done();
            });

            it('should not add a component if it does exist', function(done){
                // prepare
                var component = {
                        cid: '01',
                        name: 'n01',
                        type: 't01'
                    },
                    error = errBuilder.build(engineErrors.Generic.InternalServerError),
                    mock = {
                        addComponents: sinon.stub().returns(Q.reject(error))
                    },
                    schemaValidatorMock = {
                        validateSchema: sinon.stub().returns(function(a,b,c){c();})
                    },
                    id = uuid.v4();
                devicesHandler.__set__('schemaValidator', schemaValidatorMock);
                devicesHandler.__set__('devices', mock);
                req.body = component;
                req.params = {accountId: uuid.v4(), deviceId: id};
                req.headers = [{authorization : {}}];
                req.identity = id;
                // execute
                devicesHandler.addComponents(req, {}, function(err){
                    // attest
                    try{
                        expect(JSON.stringify(err)).to.equal(JSON.stringify(errBuilder.build(engineErrors.Generic.InternalServerError)));
                        done();
                    } catch(e){
                        done(e);
                    }
                });


            });

            it('should pass error if schema validation failed', function(done){
                // prepare
                var component = {
                        cid: '01',
                        name: 'n01',
                        type: 't01'
                    },
                    error = {
                        code: 400,
                        message: 'Invalid request'
                    },
                    schemaValidatorMock = {
                        validateSchema: sinon.stub().returns(function(a,b,c){c(error);})
                    };
                devicesHandler.__set__('schemaValidator', schemaValidatorMock);
                req.body = component;
                req.params = {accountId: uuid.v4(), deviceId: 1};
                req.identity = uuid.v4();
                // execute
                devicesHandler.addComponents(req, res, next);
                // attest
                validateSingleSchemaChosen(schemaValidatorMock);
                validateNextPassedError(error);

                done();
            });

        });

        describe('multiple', function() {

            var validateMultiSchemaChosen = function (schemaValidatorMock) {
                expect(schemaValidatorMock.validateSchema.calledOnce).to.equal(true);
                expect(JSON.stringify(schemaValidatorMock.validateSchema.args[0][0])).to.equal(JSON.stringify(schemas.deviceComponent.MULTI));
            };

            var validateAddComponentsCalledWithCorrectArgs = function (mock) {
                expect(mock.addComponents.calledOnce).to.equal(true);
                expect(mock.addComponents.args[0].length).to.equal(3);
                expect(mock.addComponents.args[0][0]).to.equal(req.params.deviceId);
                expect(mock.addComponents.args[0][1]).to.equal(req.body);
                expect(mock.addComponents.args[0][2]).to.equal(req.params.accountId);
            };

            it('should validate schema for MULTI if array passed in body', function(done){
                // prepare
                var components = [
                        {
                            cid: '01',
                            name: 'n01',
                            type: 't01'
                        },
                        {
                            cid: '02',
                            name: 'n02',
                            type: 't02'
                        }
                    ],
                    schemaValidatorMock = {
                        validateSchema: sinon.stub().returns(function(){})
                    };
                devicesHandler.__set__('schemaValidator', schemaValidatorMock);
                req.body = components;
                req.params = {accountId: uuid.v4(), deviceId: 1};
                req.identity = uuid.v4();
                // execute
                devicesHandler.addComponents(req, res, next);
                // attest
                validateMultiSchemaChosen(schemaValidatorMock);
                expect(next.called).to.equal(false);

                done();
            });

            it('should execute addComponents if request correct', function(done){
                // prepare
                var components = [
                        {
                            cid: '01',
                            name: 'n01',
                            type: 't01'
                        },
                        {
                            cid: '02',
                            name: 'n02',
                            type: 't02'
                        }
                    ],
                    mock = {
                        addComponents: sinon.stub().returns(Q.resolve(components))
                    },
                    schemaValidatorMock = {
                        validateSchema: sinon.stub().returns(function(a,b,c){c();})
                    },
                    authMock = {
                        isAdminForAccountInUri: sinon.stub().yields(null, true, true, req.identity)
                    },
                    id = uuid.v4();
                devicesHandler.__set__('schemaValidator', schemaValidatorMock);
                devicesHandler.__set__('devices', mock);
                devicesHandler.__set__('auth', authMock);
                req.body = components;
                req.params = {accountId: uuid.v4(), deviceId: id};
                req.identity = id;
                // execute
                devicesHandler.addComponents(req, res, next);
                // attest
                validateAddComponentsCalledWithCorrectArgs(mock);

                done();
            });

            it('should pass error if schema validation failed', function(done){
                // prepare
                var components = [
                        {
                            cid: '01',
                            name: 'n01',
                            type: 't01'
                        },
                        {
                            cid: '02',
                            name: 'n02',
                            type: 't02'
                        }
                    ],
                    error = {
                        code: 400,
                        message: 'Invalid request'
                    },
                    schemaValidatorMock = {
                        validateSchema: sinon.stub().returns(function(a,b,c){c(error);})
                    };
                devicesHandler.__set__('schemaValidator', schemaValidatorMock);
                req.body = components;
                req.params = {accountId: uuid.v4(), deviceId: 1};
                req.identity = uuid.v4();
                // execute
                devicesHandler.addComponents(req, res, next);
                // attest
                validateMultiSchemaChosen(schemaValidatorMock);
                expect(next.calledOnce).to.equal(true);
                expect(next.args[0].length).to.equal(1);
                expect(next.args[0][0]).to.equal(error);

                done();
            });

        });

    });

    describe('activate device', function(){
        it('should activate device', function(done){
            // prepare
            var token = { deviceToken: 'fsdfwegds' },
                mock = {
                    registerDevice: sinon.stub().callsArgWith(2, null, token)
                };
            devicesHandler.__set__('devices', mock);
            req.body = { activationCode: '123$'};
            req.params = {deviceId: 1};
            // execute
            devicesHandler.activateNewDevice(req, res, {});
            // attest
            expectOkResponse(token);

            done();
        });

        it('should not activate a device if something wrong happens', function(done){
            // prepare
            var error = new Error(500),
                mock = {
                    registerDevice: sinon.stub().callsArgWith(2, error)
                },
                nextSpy = sinon.spy();

            devicesHandler.__set__('devices', mock);
            req.body = { activationCode: '123$'};
            req.params = {deviceId: 1};
            // execute
            devicesHandler.activateNewDevice(req, {}, nextSpy);
            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);

            done();
        });
    });

    describe('get totals', function(){
        it('should respond with totals', function(done){
            // prepare
            var totals = { current: 1},
                mock = {
                    getDeviceTotals: sinon.stub().callsArgWith(1, null, totals)
                };
            devicesHandler.__set__('devices', mock);

            // execute
            devicesHandler.getDeviceTotals(req, res);

            // attest
            expectOkResponse(totals);

            done();
        });
    });

    describe('get components', function() {

        describe('all', function() {

            it('should return list of components', function(done) {
                // prepare
                var components = [ { cid: uuid.v4() } ],
                    mock = {
                        getComponents: sinon.stub().callsArgWith(1, null, components)
                    };
                devicesHandler.__set__('devices', mock);
                // execute
                devicesHandler.getComponents(req, res);
                // attest
                expect(mock.getComponents.args[0][0]).to.equal(req.params.accountId);
                expectOkResponse(components);

                done();
            });

            it('should return error when occured', function(done) {
                // prepare
                var error = new Error(500),
                    mock = {
                        getComponents: sinon.stub().callsArgWith(1, error)
                    },
                    nextSpy = sinon.spy();
                devicesHandler.__set__('devices', mock);

                // execute
                devicesHandler.getComponents(req, res, nextSpy);
                // attest
                expect(mock.getComponents.args[0][0]).to.equal(req.params.accountId);
                expect(nextSpy.calledWith(error)).to.equal(true);

                done();
            });

        });

        describe('by custom filter', function() {

            it('should return list of components', function(done) {
                // prepare
                var components = [ { cid: uuid.v4() } ],
                    mock = {
                        getComponentsByCustomFilter: sinon.stub().callsArgWith(2, null, components)
                    };
                devicesHandler.__set__('devices', mock);
                req.body = { deviceIds: [ uuid.v4() ] };
                // execute
                devicesHandler.getComponentsByCustomFilter(req, res);
                // attest
                expect(mock.getComponentsByCustomFilter.args[0][0]).to.equal(req.params.accountId);
                expect(mock.getComponentsByCustomFilter.args[0][1]).to.equal(req.body);
                expectOkResponse(components);

                done();
            });

            it('should return error when occured', function(done) {
                // prepare
                var error = new Error(500),
                    mock = {
                        getComponentsByCustomFilter: sinon.stub().callsArgWith(2, error)
                    },
                    nextSpy = sinon.spy();
                devicesHandler.__set__('devices', mock);
                req.body = { deviceIds: [ uuid.v4() ] };
                // execute
                devicesHandler.getComponentsByCustomFilter(req, res, nextSpy);
                // attest
                expect(mock.getComponentsByCustomFilter.args[0][0]).to.equal(req.params.accountId);
                expect(mock.getComponentsByCustomFilter.args[0][1]).to.equal(req.body);
                expect(nextSpy.calledWith(error)).to.equal(true);

                done();
            });

        });

    });

});
