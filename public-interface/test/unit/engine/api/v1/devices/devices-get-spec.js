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

var postgresProviderMock;

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

describe('deviceApi.getDevices', function () {
    it('should return devices', function (done) {
        // prepare
        var devices = [
                {deviceId: 1},
                {deviceId: 2}
            ],
            mock = {
                getDevices: sinon.stub().callsArgWith(1, null, devices)
            },
            callback = sinon.spy();
        devicesManager.__set__('Device', mock);

        // execute
        devicesManager.getDevices(1, callback);

        // attest
        expect(callback.calledWith(null, devices)).to.equal(true);

        done();
    });
});

describe('get device', function () {
    var callback, deviceMock, device;

    beforeEach(function () {
        device = {deviceId: 1};
        postgresProviderMock = {
            commit: sinon.spy(),
            startTransaction: sinon.stub().returns(Q.resolve()),
            rollback: sinon.spy()
        };

        deviceMock = {
            findByIdAndAccount: sinon.stub().returns(Q.resolve(device))
        };

        callback = sinon.spy();

        devicesManager.__set__('postgresProvider', postgresProviderMock);
        devicesManager.__set__('Device', deviceMock);

    });

    it('should get a device if exists', function (done) {
        // execute
        devicesManager.getDevice(device.id, 1, callback)
            .then(function(){
                // attest
                expect(callback.calledWith(null, device)).to.equal(true);
                done();
            });
    });

    it('should call callback with Device.NotFound if device does not exist', function (done) {
        // prepare
        deviceMock.findByIdAndAccount.returns(Q.resolve());
        // execute
        devicesManager.getDevice(device.id, 1, callback)
            .then(function(){
                // attest
                expect(callback.args[0][0].code).to.equal(errBuilder.Errors.Device.NotFound.code);
                done();
            });
    });
});

describe('get tags', function () {
    it('should return the list of available tags', function (done) {
        // prepare
        var tags = ['arg', 'jujuy'],
            mock = {
                all: sinon.stub().callsArgWith(1, null, tags)
            },
            callback = sinon.spy();
        devicesManager.__set__('Tag', mock);

        // execute
        devicesManager.getTags(1, callback);

        // attest
        expect(callback.calledWith(null, tags)).to.equal(true);

        done();
    });

    it('should call callback a 404 error if there are not tags', function (done) {
        // prepare
        var error = new Error(404),
            mock = {
                all: sinon.stub().callsArgWith(1, error)
            },
            callback = sinon.spy();
        devicesManager.__set__('Tag', mock);

        // execute
        devicesManager.getTags(1, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(1);
        expect(callback.args[0][0].code).to.equal(1404);

        done();
    });
});

describe('devicesApi.getDevicesTotals', function () {
    it('should return totals', function (done) {
        // prepare
        var totals = [],
            mock = {
                getTotals: sinon.stub().callsArgWith(1, null, totals)
            },
            callback = sinon.spy();
        devicesManager.__set__('Device', mock);

        // execute
        devicesManager.getDeviceTotals(1, callback);

        // attest
        expect(callback.calledWith(null, {device: totals})).to.equal(true);

        done();
    });
});

describe('deviceApi.findByCriteria', function () {
    it('should return a list of devices and metrics according to filters', function (done) {
        // prepare
        var devices = [
                {deviceId: 1},
                {deviceId: 2}
            ],
            mock = {
                findByCriteria: sinon.stub().callsArgWith(2, null, devices)
            },
            callback = sinon.spy();
        devicesManager.__set__('Device', mock);

        // execute
        devicesManager.findByCriteria({id: "1"}, {}, callback);

        // attest
        expect(callback.calledWith(null, devices)).to.equal(true);

        done();
    });

    it('should call callback with 5400 error code if criteria is not valid', function (done) {
        // prepare
        var devices = [
                {deviceId: 1},
                {deviceId: 2}
            ],
            mock = {
                all: sinon.stub().callsArgWith(2, null, devices)
            },
            callback = sinon.spy();
        devicesManager.__set__('Device', mock);

        // execute
        devicesManager.findByCriteria(null, {}, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(1);
        expect(callback.args[0][0].code).to.equal(6400);

        done();
    });
});
