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

describe('dataApi.report', function() {
    var accountId,
        account,
        result,
        reportRequest,
        accountAPIMock,
        proxyMock,
        callback,
        error;

    beforeEach(function() {
        callback = sinon.spy();
        accountId = uuid.v4();
        account = {
            public_id: uuid.v4()
        };
        reportRequest = {};
        result = {
            report: "report"
        };
        proxyMock = {
            report: sinon.stub().callsArgWith(1, null, result)
        };
        accountAPIMock = {
            getAccount: sinon.stub().callsArgWith(1, null, account)
        };
        dataManager.__set__('proxy', proxyMock);
        dataManager.__set__('AccountAPI', accountAPIMock);
    });

    it('should return report if everything is ok', function (done) {
        // prepare

        // execute
        dataManager.report(accountId, reportRequest, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.getCall(0).args[1]).to.equal(result);
        expect(accountAPIMock.getAccount.calledOnce).to.equal(true);
        expect(proxyMock.report.calledOnce).to.equal(true);

        done();
    });

    it('should return error if account not found', function (done) {
        // prepare
        error = errBuilder.Errors.Account.NotFound;
        accountAPIMock.getAccount = sinon.stub().callsArgWith(1, error);

        // execute
        dataManager.report(accountId, reportRequest, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.calledWith(error)).to.equal(true);

        done();
    });

    it('should return error if something crashes in proxy', function (done) {
        // prepare
        error = errBuilder.Errors.Generic.InternalServerError;
        proxyMock.report = sinon.stub().callsArgWith(1, error, null);

        // execute
        dataManager.report(accountId, reportRequest, callback);
        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.calledWith(error)).to.equal(true);
        expect(accountAPIMock.getAccount.calledOnce).to.equal(true);
        expect(proxyMock.report.calledOnce).to.equal(true);

        done();
    });

});
