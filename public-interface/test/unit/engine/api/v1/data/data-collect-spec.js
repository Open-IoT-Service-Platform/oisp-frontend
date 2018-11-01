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
    dataManager = rewire('../../../../../../engine/api/v1/data'),
    errBuilder = require('../../../../../../lib/errorHandler').errBuilder,
    config = require('../../../../../../config'),
    uuid = require('node-uuid'),
    Q = require('q');

describe('dataApi.collectData', function () {
    var options, deviceResponse;
    var domain = {
        id: uuid.v4(),
        public_id: uuid.v4(),
        healthTimePeriod: 1
    };

    var deviceMock,
        proxyMock,
        componentId,
        callback,
        error,
        errorObj;

    beforeEach(function () {
        callback = sinon.spy();
        error = null;
        errorObj = null;
        errorObj = null;
        componentId = uuid.v4();
        options = {
            deviceId: "deviceId",
            data: {
                accountId: domain.public_id,
                data: [
                    {componentId: componentId, value:"1"}
                ]
            },
            accountId: uuid.v4(),
            forwarded: false,
            gatewayId: "gatewayId"
        };
        deviceResponse = {
            deviceId: options.deviceId,
            gatewayId: options.gatewayId,
            healthTimePeriod: 10000,
            domainId: domain.public_id,
            components: [{cid: componentId, type: 'humidity.v1.0', componentType:{dataType:"Number"}}]
        };
        deviceMock = {
            getDevice: sinon.stub().callsArgWith(2, null, deviceResponse),
            updateLastVisit: sinon.stub().returns(Q.resolve())
        };

        proxyMock = {
            submitDataREST: sinon.stub().callsArgWith(1, null)
        };

        dataManager.__set__('DevicesAPI', deviceMock);
        dataManager.__set__('proxy', proxyMock);

    });

    it('should call proxy if forwarded == false', function (done) {
        // prepare
        // execute
        dataManager.collectData(options, callback);

        // attest
        expect(deviceMock.getDevice.calledOnce).to.equal(true);
        expect(proxyMock.submitDataREST.calledOnce).to.equal(true);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(1);
        expect(callback.args[0][0]).to.be(null);

        done();
    });

    it('should call proxy if forwarded == false, error thrown by proxy', function (done) {
        // prepare
        error = new Error(400);
        proxyMock.submitDataREST = sinon.stub().callsArgWith(1, error);

        // execute
        dataManager.collectData(options, callback);

        // attest
        expect(deviceMock.getDevice.calledOnce).to.equal(true);
        expect(proxyMock.submitDataREST.calledOnce).to.equal(true);
        expect(callback.calledWith(error)).to.equal(true);

        done();
    });

    it('should not call proxy if forwarded == false, device does not exist', function (done) {
        // prepare
        deviceMock.getDevice = sinon.stub().callsArgWith(2, null, null);

        // execute
        dataManager.collectData(options, callback);

        // attest
        expect(deviceMock.getDevice.calledOnce).to.equal(true);
        expect(proxyMock.submitDataREST.calledOnce).to.equal(false);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(1);
        expect(callback.args[0][0].code).to.equal(1404);

        done();
    });

    it('should return error if device not found', function (done) {
        // prepare
        error = errBuilder.build(errBuilder.Errors.Device.NotFound);
        deviceMock.getDevice = sinon.stub().callsArgWith(2, error, null);

        // execute
        dataManager.collectData(options, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.calledWith(error)).to.equal(true);

        done();
    });

    it('should return error if not authorized', function (done) {
        // prepare
        error = errBuilder.build(errBuilder.Errors.Generic.NotAuthorized);
        errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
        deviceResponse.gatewayId = 'gatewayId_2';

        // execute
        dataManager.collectData(options, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.calledWith(sinon.match(errorObj)));

        done();
    });

    it('should return error if components not found', function (done) {
        // prepare
        error = errBuilder.build(errBuilder.Errors.Device.Component.NotFound);
        errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
        deviceResponse.components = [];

        // execute
        dataManager.collectData(options, callback);
        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.calledWith(sinon.match(errorObj)));

        done();
    });

});