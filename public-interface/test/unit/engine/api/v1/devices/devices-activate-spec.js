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
    errBuilder  = require("../../../../../../lib/errorHandler/index").errBuilder,
    Q = require('q'),
    devicesManager = rewire('../../../../../../engine/api/v1/devices');

describe('deviceApi.registerDevice', function () {
    var deviceMock = {}, authMock = {};

    beforeEach(function() {
        deviceMock = {
            new: sinon.stub().returns(Q.resolve()),
            status: {active:"active"},
            confirmActivation: sinon.stub().returns(Q.resolve({
                activated: true,
                accountId: 1
            }))
        };
        authMock = {
            generateToken: sinon.stub().callsArgWith(4, null, "token")
        };

        devicesManager.__set__('Device', deviceMock);
        devicesManager.__set__('auth', authMock);
    });

    it('should activate a device if device exists', function (done) {
        // prepare
        var
            account = {activation_code:'1q2w3e4r5t6y'},
            device = {
                deviceId: 1,
                status: "created"
            },
            callback = sinon.spy();

        // execute
        devicesManager.registerDevice(device, account.activation_code, callback)
            .then(function(){
                // attest
                expect(callback.calledOnce).to.equal(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0].length).to.equal(2);
                var actual = callback.args[0][1];
                expect(actual).to.have.property('deviceToken');
                expect(deviceMock.new.calledOnce).to.equal(false);
                expect(callback.args[0][0]).to.be(null);
                expect(deviceMock.confirmActivation.calledOnce).to.equal(true);
                done();

            }).catch(function (error) {
                done(error);
            });
    });

    it('should not activate if activation code is not valid', function (done) {
        // prepare
        var device = {
                deviceId: 1,
                status: "created"
            },

            callback = sinon.spy();

        deviceMock.confirmActivation = sinon.stub().returns(Q.reject(errBuilder.Errors.Device.InvalidActivationCode));

        // execute
        devicesManager.registerDevice(device, "wrong-code", callback)
            .then(function(){
                // attest
                expect(callback.calledOnce).to.equal(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0][0].code).to.be(errBuilder.Errors.Device.InvalidActivationCode.code);
                done();
            }).catch(function (error) {
                done(error);
            });
    });

    it('should not activate a device if account not found', function (done) {
        // prepare
        var
            account = {activation_code:'1q2w3e4r5t6y'},
            device = {
                deviceId: 1,
                status: "created"
            },
            callback = sinon.spy();
        deviceMock.confirmActivation = sinon.stub().returns(Q.reject(errBuilder.Errors.Account.NotFound));
        devicesManager.__set__('Device', deviceMock);
        // execute
        devicesManager.registerDevice(device, account.activation_code, callback)
            .then(function(){
                // attest
                expect(callback.calledOnce).to.equal(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0][0].code).to.be(errBuilder.Errors.Account.NotFound.code);
                done();
            }).catch(function (error) {
                done(error);
            });
    });

    it('should create and activate a device if it does not exist', function (done) {
        // prepare
        var
            account = {activation_code:'1q2w3e4r5t6y'},
            device = {
                deviceId: 1,
                status: "created"
            },
            deviceMock = {
                new: sinon.stub().returns(Q.resolve(device)),
                status: {active:"active"},
                confirmActivation: sinon.stub().returns(Q.resolve({
                    activated: false,
                    accountId: 1
                }))
            },
            deviceManagerMock = {
                isDeviceRegisteredInAccount: sinon.stub().withArgs(device.deviceId, account).returns(Q.resolve(false))
            },
            postgresProviderMock = {
                startTransaction: sinon.stub().returns(Q.resolve()),
                commit: sinon.stub().returns(Q.resolve()),
                rollback: sinon.stub().returns(Q.resolve())
            },
            callback = sinon.spy();

        devicesManager.__set__('Device', deviceMock);
        devicesManager.__set__('deviceManager', deviceManagerMock);
        devicesManager.__set__('postgresProvider', postgresProviderMock);

        // execute
        devicesManager.registerDevice(device, account.activation_code, callback)
            .then(function(){
                // attest
                expect(callback.calledOnce).to.equal(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0].length).to.equal(2);
                var actual = callback.args[0][1];

                expect(actual).to.have.property('deviceToken');
                expect(deviceMock.new.calledOnce).to.equal(true);
                expect(callback.args[0][0]).to.be(null);
                done();

            }).catch(function (error) {
                done(error);
            });
    });


    it('should not activate a device if confirmation fails', function (done) {
        // prepare
        var
            account = {activation_code:'1q2w3e4r5t6y'},
            device = {
                deviceId: 1,
                status: "created"
            },
            deviceMock = {
                new: sinon.stub().returns(Q.resolve()),
                status: {active:"active"},
                confirmActivation: sinon.stub().returns(Q.reject())
            },
            deviceManagerMock = {
                isDeviceRegisteredInAccount: sinon.stub().withArgs(device.deviceId, account).returns(Q.resolve(true))

            },
            callback = sinon.spy();

        devicesManager.__set__('Device', deviceMock);
        devicesManager.__set__('deviceManager', deviceManagerMock);

        // execute
        devicesManager.registerDevice(device, account.activation_code, callback)
            .then(function(){
                // attest
                expect(callback.calledOnce).to.equal(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0][0].code).to.be(errBuilder.Errors.Device.RegistrationError.code);
                done();
            }).catch(function (error) {
                done(error);
            });
    });
});
