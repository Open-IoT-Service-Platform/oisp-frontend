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
    Q = require('q'),
    errBuilder  = require("../../../../../../lib/errorHandler/index").errBuilder,
    uuid = require('uuid'),
    devicesManager = rewire('../../../../../../engine/api/v1/devices');

describe('devicesApi.updateDevice', function () {
    var accountId, existingDevice, deviceUpdated, deviceMock, deviceManagerMock, postgresProviderMock;

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
        existingDevice = {
            deviceId: 1,
            components: [
                {
                    cid: '01',
                    name: '01'
                },
                {
                    cid: '02',
                    name: '02'
                }
            ],
            status : "active",
            domainId: uuid.v4()
        };
        deviceUpdated= {
            deviceId: 1,
            components: [
                {
                    cid: '01',
                    name: '01'
                },
                {
                    cid: '02',
                    name: '02'
                }
            ],
            status : "active",
            domainId: uuid.v4()
        };
        accountId = existingDevice.domainId;

        deviceMock = {
            findByIdAndAccount: sinon.stub().returns(Q.resolve(existingDevice)),
            updateByIdAndAccount: sinon.stub().returns(Q.resolve())
        };

        deviceManagerMock = {
            setComponentTypeId: sinon.stub(),
            isDeviceActive: function(obj){
                return obj.status === "active";
            },
            removeComponentTypeId: sinon.stub()
        };

        postgresProviderMock = {
            commit: sinon.stub().returns(Q.resolve()),
            startTransaction: sinon.stub().returns(Q.resolve()),
            rollback: sinon.stub().returns(Q.resolve({
                done: sinon.stub().returns(Q.resolve())
            }))
        };

        devicesManager.__set__('postgresProvider', postgresProviderMock);
        devicesManager.__set__('Device', deviceMock);
        devicesManager.__set__('deviceManager', deviceManagerMock);
    });

    it('should update an existing device', function (done) {
        // prepare

        // execute
        devicesManager.updateDevice(deviceUpdated.deviceId, deviceUpdated, accountId)
            .then(function(){
                // attest
                assertPostgressTransactionSucceded();
                done();
            }).catch(function(error){
                done(error);
            });
    });

    it('should call callback with a Device.SavingError when something wrong happens when updating a device', function (done) {
        // prepare
        deviceMock.updateByIdAndAccount.returns(Q.reject());
        // execute
        devicesManager.updateDevice(deviceUpdated.deviceId, deviceUpdated, accountId)
            .then(function(){
                done('Error: No error is thrown');
            }).catch(function(){
                // attest
                assertPostgressTransactionFailed();
                expect(deviceMock.updateByIdAndAccount.calledOnce).to.be(true);
                done();
            });
    });

    it('should call callback with a Device.NotFound when a device does not exist after update', function (done) {
        // prepare
        var callback = sinon.spy();
        deviceMock.updateByIdAndAccount.returns(Q.reject(errBuilder.Errors.Device.NotFound));
        // execute
        devicesManager.updateDevice(deviceUpdated.deviceId, deviceUpdated, accountId)
            .then(function(){
                done('Error: No error is thrown');
            }).catch(function(){
                // attest
                assertPostgressTransactionFailed();
                expect(deviceMock.updateByIdAndAccount.calledOnce).to.be(true);
                done();
            });
    });

    it('should call callback with a Device.NotFound when a device does not exist', function (done) {
        // prepare
        var callback = sinon.spy();
        deviceMock.findByIdAndAccount.returns(Q.resolve());
        // execute
        devicesManager.updateDevice(deviceUpdated.deviceId, deviceUpdated, accountId)
            .then(function(){
                done('Error: No error is thrown');
            }).catch(function(){
                // attest
                assertPostgressTransactionFailed();
                expect(deviceMock.updateByIdAndAccount.calledOnce).to.be(true);
                done();
            });
    });
});
