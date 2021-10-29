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
    uuid = require('uuid');

describe('dataApi.firstLastMeasurement', function () {
    var accId,
        data,
        componentResponse,
        result,
        proxyMock,
        callback,
        componentMock,
        error,
        errorObj;

    beforeEach(function () {
        callback = sinon.spy();
        accId = uuid.v4();
        data = {
            components: []
        };
        result = {
            data: []
        };
        componentResponse = ["cid1", "cid2"];

        proxyMock = {
            getFirstAndLastMeasurement: sinon.stub().callsArgWith(1, null, result)
        };
        componentMock = {
            getByCustomFilter: sinon.stub().callsArgWith(2, null, componentResponse)
        };

        dataManager.__set__('Component', componentMock);
        dataManager.__set__('proxy', proxyMock);
    });

    it('should return result if everything is ok', function (done) {
        // prepare

        // execute
        dataManager.firstLastMeasurement(accId, data, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.getCall(0).args[0]).to.equal(null);
        expect(callback.getCall(0).args[1]).to.equal(result);
        expect(componentMock.getByCustomFilter.calledOnce).to.equal(true);
        expect(proxyMock.getFirstAndLastMeasurement.calledOnce).to.equal(true);

        done();
    });

    it('should return error if ids not found', function (done) {
        // prepare
        error = errBuilder.build(errBuilder.Errors.Device.Component.NotFound);
        errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
        componentMock.getByCustomFilter = sinon.stub().callsArgWith(2, error, null);

        // execute
        dataManager.firstLastMeasurement(accId, data, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.calledWith(sinon.match(errorObj))).to.equal(true);

        done();
    });

    it('should return error if something in proxy crashes', function (done) {
        // prepare
        error = errBuilder.Errors.Generic.InternalServerError;
        proxyMock.getFirstAndLastMeasurement = sinon.stub().callsArgWith(1, error, null);

        // execute
        dataManager.firstLastMeasurement(accId, data, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.getCall(0).args[0]).to.equal(error);
        expect(componentMock.getByCustomFilter.calledOnce).to.equal(true);
        expect(proxyMock.getFirstAndLastMeasurement.calledOnce).to.equal(true);

        done();
    });

    it('should return error and result if something in proxy crashes but result is retrieved', function (done) {
        // prepare
        error = errBuilder.Errors.Generic.InternalServerError;
        proxyMock.getFirstAndLastMeasurement = sinon.stub().callsArgWith(1, error, result);

        // execute
        dataManager.firstLastMeasurement(accId, data, callback);
        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.getCall(0).args[0]).to.equal(error);
        expect(callback.getCall(0).args[1]).to.equal(result);
        expect(componentMock.getByCustomFilter.calledOnce).to.equal(true);
        expect(proxyMock.getFirstAndLastMeasurement.calledOnce).to.equal(true);

        done();
    });
});
