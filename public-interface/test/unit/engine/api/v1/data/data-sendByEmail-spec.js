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

describe('dataApi.sendByEmail', function () {
    var accountId, searchRequest, dataMock, csv, response, user;
    var mailerMock, usersMock, callback, error;

    beforeEach(function () {
        callback = sinon.spy();
        mailerMock = {};
        usersMock = {};
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
        csv = "Device Id,Device Name,Component Id,Component Name,Component Type,Time Stamp,Value\n" +
            "testdevice01,Device 10,436e7e74-1111-1111-9057-26932f5eb7e1,Temperature Sensor 1,temperature.v1.0,1369881520000,17\n" +
            "testdevice01,Device 10,436e7e74-1111-1111-9057-26932f5eb7e1,Temperature Sensor 1,temperature.v1.0,1369881520500,21";
        response = {
            from: 0,
            to: 1491040000000,
            csv: csv
        };
        user = {
            userId: 1,
            accounts: {}
        };


        dataMock = {
            exportToCsv: sinon.stub().callsArgWith(2, null, response)
        };
        mailerMock = {
            send: sinon.stub()
        };
        usersMock = {
            //findByEmail: sinon.stub().callsArgWith(1, null, user)
            searchUser: sinon.stub().callsArgWith(1, null, user)
        };

        dataManager.__set__('mailer', mailerMock);
        dataManager.__set__('UsersAPI', usersMock);

    });

    it('should not send data in csv format by email if CSV export returns error', function (done) {
        // prepare
        error = errBuilder.Errors.Generic.InternalServerError;
        dataMock.exportToCsv = sinon.stub().callsArgWith(2, error, null);

        var oldExportToCsv = dataManager.exportToCsv;
        dataManager.exportToCsv = dataMock.exportToCsv;

        // execute
        dataManager.sendByEmail(accountId, searchRequest, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.getCall(0).args[0]).to.equal(error);
        expect(dataMock.exportToCsv.calledOnce).to.equal(true);

        // revert
        dataManager.exportToCsv = oldExportToCsv;

        done();
    });

    it('should not send data in csv format by email because recipient is not a user', function (done) {
        // prepare
        var oldExportToCsv = dataManager.exportToCsv;
        dataManager.exportToCsv = dataMock.exportToCsv;

        // execute
        dataManager.sendByEmail(accountId, searchRequest, callback);

        // attest
        expect(dataManager.exportToCsv.calledOnce).to.equal(true);
        expect(mailerMock.send.callCount).to.equal(0);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(1);

        // revert
        dataManager.exportToCsv = oldExportToCsv;

        done();
    });
    it('should not send data in csv format by email because recipients are not provided', function (done) {
        // prepare
        delete searchRequest.recipients;

        dataMock.exportToCsv = sinon.stub().callsArgWith(2, null, {});
        var oldExportToCsv = dataManager.exportToCsv;
        dataManager.exportToCsv = dataMock.exportToCsv;

        // execute
        dataManager.sendByEmail(accountId, searchRequest, callback);

        // attest
        expect(dataManager.exportToCsv.callCount).to.equal(0);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(1);

        // revert
        dataManager.exportToCsv = oldExportToCsv;

        done();
    });

    it('should not send data in csv format by email because recipient does not belong to this account', function (done) {
        // prepare
        user.accounts[uuid.v4()] = "admin";

        var oldExportToCsv = dataManager.exportToCsv;
        dataManager.exportToCsv = dataMock.exportToCsv;

        // execute
        dataManager.sendByEmail(accountId, searchRequest, callback);

        // attest
        expect(dataManager.exportToCsv.calledOnce).to.equal(true);
        expect(mailerMock.send.callCount).to.equal(0);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(1);

        // revert
        dataManager.exportToCsv = oldExportToCsv;

        done();
    });
});
