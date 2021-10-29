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


describe('deviceApi.deleteDevice', function () {

    var accountId, existingDevice, deviceMock, deviceManagerMock, postgresProviderMock;



    beforeEach(function () {

        existingDevice = {
            deviceId: 1,
            domainId: uuid.v4(),
            status: "active"
        };
        accountId = existingDevice.domainId;

        deviceMock = {
            findByIdAndAccount: sinon.stub().returns(Q.resolve(existingDevice)),
            delete: sinon.stub().returns(Q.resolve())
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

        devicesManager.__set__('postgresProvider', postgresProviderMock);
        devicesManager.__set__('Device', deviceMock);
        devicesManager.__set__('deviceManager', deviceManagerMock);
    });

    it('should delete a device if exists', function (done) {
        // prepare
        var callback = sinon.spy();
        // execute
        devicesManager.deleteDevice(existingDevice.deviceId, accountId, callback)
            .then(function(){
                // attest
                expect(callback.calledOnce).to.be(true);
                expect(callback.calledWith(null)).to.equal(true);
                expect(deviceMock.delete.calledOnce).to.be(true);

                done();
            }).catch(function(error){
                done(error);
            });
    });

    it('should call callback with Device.NotFound if device does not exist', function (done) {
        // prepare
        var callback = sinon.spy();
        deviceMock.findByIdAndAccount.returns(Q.resolve());
        // execute
        devicesManager.deleteDevice(existingDevice.deviceId, accountId, callback)
            .then(function(){
                // attest
                expect(callback.calledOnce).to.be(true);
                expect(callback.args[0][0].code).to.equal(errBuilder.Errors.Device.NotFound.code);
                expect(deviceMock.delete.calledOnce).to.be(false);

                done();
            }).catch(function(error){
                done(error);
            });
    });

    it('should call callback with Device.DeletionError if deletion from database failed.', function (done) {
        // prepare
        var callback = sinon.spy();
        deviceMock.delete.returns(Q.reject());
        // execute
        devicesManager.deleteDevice(existingDevice.deviceId, accountId, callback)
            .then(function(){
                // attest

                expect(callback.calledOnce).to.be(true);
                expect(callback.args[0][0].code).to.equal(errBuilder.Errors.Device.DeletionError.code);
                expect(deviceMock.delete.calledOnce).to.be(true);

                done();
            }).catch(function(error){
                done(error);
            });
    });


});
