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

describe('dataAPi.searchAdvanced', function () {

    var account = {
        id: uuid.v4(),
        public_id: uuid.v4(),
        healthTimePeriod: 1
    };

    var accountId, searchRequest, response, resolvedDevices;
    var deviceMock, accountAPIMock, proxyMock, callback, error;

    beforeEach(function () {
        callback = sinon.spy();
        accountId = uuid.v4();
        searchRequest = {
            "from": 0,
            "to": 1491040000000,
            "targetFilter": {
                "deviceList": [
                    "testdevice01"
                ]
            },
            "metrics": [
                {
                    "id": "436e7e74-1111-1111-9057-26932f5eb7e1",
                    "op": "none"
                }
            ],
            "recipients": [
                "sample@email"
            ]
        };
        response = { data: [] };
        resolvedDevices = [
            {
                "_id": "535e646993ddc5db1492965b",
                "cd": 1398695017173,
                "components": [
                    {
                        "cid": "436e7e74-1111-1111-9057-26932f5eb7e1",
                        "name": "Temperature Sensor 1",
                        "type": "temperature.v1.0",
                        "componentType": {
                            "dataType": "Number"
                        }
                    }
                ],
                "deviceId": "testdevice01",
                "do_id": "1",
                "g_id": "00-21-CC-C4-2B-11",
                "name": "Device 10",
                "status": "active"
            }
        ];
        accountAPIMock = {
            getAccount: sinon.stub().callsArgWith(1, null, account)
        };
        proxyMock = {
            dataInquiryAdvanced: sinon.stub().callsArgWith(1, null, response)
        };
        deviceMock = {
            findByCriteria: sinon.stub().callsArgWith(2, null, resolvedDevices)
        };



        dataManager.__set__('AccountAPI', accountAPIMock);
        dataManager.__set__('DevicesAPI', deviceMock);
        dataManager.__set__('proxy', proxyMock);
    });

    it('should return result if everything is ok', function (done) {
        // prepare

        // execute
        dataManager.searchAdvanced(accountId, searchRequest, callback);
        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.getCall(0).args[1]).to.equal(response);
        expect(proxyMock.dataInquiryAdvanced.calledOnce).to.equal(true);
        expect(deviceMock.findByCriteria.calledOnce).to.equal(true);

        done();
    });

    it('should return error if account not found', function (done) {
        // prepare
        error = errBuilder.Errors.Account.NotFound;
        deviceMock.findByCriteria = sinon.stub().callsArgWith(2, error, null);

        // execute
        dataManager.searchAdvanced(accountId, searchRequest, callback);

        // attest
        expect(deviceMock.findByCriteria.calledOnce).to.equal(true);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.calledWith(error)).to.equal(true);

        done();

    });

    it('should return error if aa_proxy returns error', function (done) {
        // prepare
        error = errBuilder.Errors.Generic.InternalServerError;
        proxyMock.dataInquiryAdvanced = sinon.stub().callsArgWith(1, error, null);

        // execute
        dataManager.searchAdvanced(accountId, searchRequest, callback);
        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.calledWith(error)).to.equal(true);

        done();
    });

    it('should return error and result if error is encountered but result is retrieved', function (done) {
        // prepare
        error = errBuilder.Errors.Generic.InternalServerError;
        proxyMock.dataInquiryAdvanced = sinon.stub().callsArgWith(1, error, response);

        // execute
        dataManager.searchAdvanced(accountId, searchRequest, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.getCall(0).args[1]).to.equal(response);
        expect(callback.getCall(0).args[0]).to.equal(error);
        expect(proxyMock.dataInquiryAdvanced.calledOnce).to.equal(true);
        expect(deviceMock.findByCriteria.calledOnce).to.equal(true);

        done();
    });
});
