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
    uuid = require('node-uuid');

describe('dataApi.search', function () {

    var account = {
        id: uuid.v4(),
        public_id: uuid.v4(),
        healthTimePeriod: 1
    };

    var searchRequest, deviceList, response, callbackResponse, accountAPIMock;
    var deviceMock, proxyMock, callback, error;

    beforeEach(function () {
        callback = sinon.spy();
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
            ]
        };
        deviceList = [
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
        response = {
            "msgType": "basicDataInquiryResponse",
            "accountId": "1",
            "startDate": 0,
            "endDate": 1491040000000,
            "components": [
                {
                    "componentId": "436e7e74-1111-1111-9057-26932f5eb7e1",
                    "attributes": {},
                    "samples": [
                        ["1369881520000", "17"]
                    ]
                }
            ]
        };
        callbackResponse = {
            "from": 0,
            "to": 1491040000000,
            "maxPoints": undefined,
            "series": [
                {
                    "deviceId": "testdevice01",
                    "deviceName": "Device 10",
                    "componentId": "436e7e74-1111-1111-9057-26932f5eb7e1",
                    "componentName": "Temperature Sensor 1",
                    "componentType": "temperature.v1.0",
                    "attributes": {},
                    "points": [
                        {
                            "ts": "1369881520000",
                            "value": "17"
                        }
                    ]
                }
            ],
            "pointsLimit": '1000'
        };
        deviceMock = {
            findByCriteria:sinon.stub().callsArgWith(2, null, deviceList)
        };
        proxyMock = {
            dataInquiry: sinon.stub().callsArgWith(1, null, response)
        };
        accountAPIMock = {
            getAccount: sinon.stub().callsArgWith(1, null, account)
        };

        dataManager.__set__('AccountAPI', accountAPIMock);
        dataManager.__set__('DevicesAPI', deviceMock);
        dataManager.__set__('proxy', proxyMock);
    });

    it('should call proxy and retrieve data, using Criteria', function (done) {
        // prepare

        // execute
        dataManager.search(account, searchRequest, callback);

        // attest
        expect(deviceMock.findByCriteria.calledOnce).to.equal(true);
        expect(proxyMock.dataInquiry.calledOnce).to.equal(true);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(2);
        expect(JSON.stringify(callback.args[0][1])).to.equal(JSON.stringify(callbackResponse));

        done();
    });

    it('should use "0" as from if from is not given', function (done) {
        // prepare
        delete searchRequest.from;

        // execute
        dataManager.search(account, searchRequest, callback);

        // attest
        expect(deviceMock.findByCriteria.calledOnce).to.equal(true);
        expect(proxyMock.dataInquiry.calledOnce).to.equal(true);
        expect(proxyMock.dataInquiry.args[0][0].from).to.equal(0);
        expect(callback.calledOnce).to.equal(true);
        expect(JSON.stringify(callback.args[0][1])).to.equal(JSON.stringify(callbackResponse));
        done();
    });

    it('should call proxy and retrieve no data', function (done) {
        // prepare
        // execute
        dataManager.search(account, searchRequest, callback);

        // attest
        expect(deviceMock.findByCriteria.calledOnce).to.equal(true);
        expect(proxyMock.dataInquiry.calledOnce).to.equal(true);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(2);
        expect(JSON.stringify(callback.args[0][1])).to.equal(JSON.stringify(callbackResponse));
        done();
    });

    it('should NOT call proxy and retrieve empty response when devices not found', function (done) {
        // prepare
        deviceMock.findByCriteria = sinon.stub().callsArgWith(2, null, []);

        // execute
        dataManager.search(account, searchRequest, callback);

        // attest
        expect(deviceMock.findByCriteria.calledOnce).to.equal(true);
        expect(proxyMock.dataInquiry.calledOnce).to.equal(false);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(2);
        expect(callback.args[0][1]).to.be.empty();

        done();
    });

    it('should return error when no target filter provided', function (done) {
        // prepare
        searchRequest.targetFilter = {};

        // execute
        dataManager.search(account, searchRequest, callback);

        // attest
        expect(deviceMock.findByCriteria.calledOnce).to.equal(false);
        expect(proxyMock.dataInquiry.calledOnce).to.equal(false);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(1);
        expect(callback.args[0][0].code).to.equal(6400);

        done();
    });

    it('should return error if something in proxy returns error', function (done) {
        // prepare
        error = errBuilder.Errors.Generic.InternalServerError;
        proxyMock.dataInquiry = sinon.stub().callsArgWith(1, error, null);

        // execute
        dataManager.search(account, searchRequest, callback);

        // attest
        expect(deviceMock.findByCriteria.calledOnce).to.equal(true);
        expect(proxyMock.dataInquiry.calledOnce).to.equal(true);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(2);
        expect(JSON.stringify(callback.args[0][0])).to.equal(JSON.stringify(error));

        done();

    });

    it('should return error and result if something crashes but result is retrieved', function (done) {
        // prepare
        error = errBuilder.Errors.Generic.InternalServerError;
        proxyMock.dataInquiry = sinon.stub().callsArgWith(1, error, response);

        // execute
        dataManager.search(account, searchRequest, callback);

        // attest
        expect(deviceMock.findByCriteria.calledOnce).to.equal(true);
        expect(proxyMock.dataInquiry.calledOnce).to.equal(true);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(2);
        expect(JSON.stringify(callback.args[0][0])).to.equal(JSON.stringify(error));
        expect(JSON.stringify(callback.args[0][1])).to.equal(JSON.stringify(response));

        done();
    });

    it('should return error if account not found', function (done) {
        // prepare
        error = errBuilder.Errors.Account.NotFound;
        accountAPIMock.getAccount = sinon.stub().callsArgWith(1, error, null);

        // execute
        dataManager.search(account, searchRequest, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(1);

        done();
    });
});
