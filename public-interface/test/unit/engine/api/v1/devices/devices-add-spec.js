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
    errBuilder  = require("../../../../../../lib/errorHandler/index").errBuilder,
    Q = require('q'),
    uuid = require('uuid'),
    devicesManager = rewire('../../../../../../engine/api/v1/devices');

describe('devicesApi.addDevice', function () {

    var accountId, device, deviceMock, deviceManagerMock, postgresProviderMock, callback;

    function assertPostgressTransactionSucceded(){
        assertTransactionRollbackIs(false);
    }

    function assertPostgressTransactionFailed(){
        assertTransactionRollbackIs(true);
    }

    function assertTransactionRollbackIs(rollbackExpected){
        rollbackExpected = rollbackExpected || false;
        var commitExpected = !rollbackExpected;
        expect(postgresProviderMock.startTransaction.calledOnce).to.be(true);
        expect(postgresProviderMock.rollback.calledOnce).to.be(rollbackExpected);
        expect(postgresProviderMock.commit.calledOnce).to.be(commitExpected);
    }

    beforeEach(function () {

        device = {
            deviceId: 1,
            domainId: uuid.v4(),
            status: "created"
        };
        accountId = device.domainId;

        deviceMock = {
            new: sinon.stub().returns(Q.resolve(device)),
            status: {
                created: "created"
            }
        };


        deviceManagerMock = {
            setComponentTypeId: sinon.stub(),
            isDeviceActive: function(obj){
                return obj.status === "active";
            },
            removeComponentTypeId: sinon.stub()
        };

        postgresProviderMock = {
            commit: sinon.spy(),
            startTransaction: sinon.stub().returns(Q.resolve()),
            rollback: sinon.spy()
        };

        callback = sinon.spy();

        devicesManager.__set__('postgresProvider', postgresProviderMock);
        devicesManager.__set__('Device', deviceMock);
        devicesManager.__set__('deviceManager', deviceManagerMock);
    });

    it('should add a device if it does not exist', function (done) {

        // execute
        devicesManager.addDevice(device, 1, callback)
            .then(function(){
                // attest

                expect(callback.calledOnce).to.equal(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0].length).to.equal(2);
                expect(callback.args[0][1]).to.equal(device);
                expect(deviceMock.new.calledOnce).to.equal(true);
                done();
            }).catch(function(error){
                done(error);
            });
    });

    it('should call callback with Device.SavingError when an error occurs during saving', function (done) {
        // prepare
        deviceMock.new.returns(Q.reject());
        // execute
        devicesManager.addDevice(device, 1, callback)
            .then(function(){
                // attest

                expect(callback.calledOnce).to.equal(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0].length).to.equal(1);
                expect(callback.args[0][0].code).to.equal(errBuilder.Errors.Device.SavingError.code);
                expect(deviceMock.new.calledOnce).to.equal(true);
                done();
            }).catch(function(error){
                done(error);
            });
    });

    it('should call callback with db error code when creating fails', function (done) {
        // prepare
        deviceMock.new.returns(Q.reject({code:400}));
        // execute
        devicesManager.addDevice(device, 1, callback)
            .then(function(){
                // attest

                expect(callback.calledOnce).to.equal(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0].length).to.equal(1);
                expect(callback.args[0][0].code).to.equal(400);
                expect(deviceMock.new.calledOnce).to.equal(true);
                done();
            }).catch(function(error){
                done(error);
            });
    });
});
