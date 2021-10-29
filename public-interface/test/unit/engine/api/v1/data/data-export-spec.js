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

describe('dataApi.exportToCsv', function () {
    var searchRequest,
        accountId,
        user,
        csv,
        searchResponse,
        dataMock,
        oldSearch,
        mail,
        mailerMock,
        usersAPIMock,
        callback,
        error;

    beforeEach(function () {
        callback = sinon.spy();
        accountId = uuid.v4();
        user = {
            userId: uuid.v4(),
            accounts: {}
        };
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
        searchResponse = {
                "from": 0,
                "to": 1491040000000,
                "series": [
                    {
                        "deviceId": "testdevice01",
                        "deviceName": "Device 10",
                        "componentId": "436e7e74-1111-1111-9057-26932f5eb7e1",
                        "componentName": "Sensor 1",
                        "componentType": "Temperature Sensor.v1.0",
                        "points": [
                            {"ts": "1406212541097", "value": "17"},
                            {"ts": "1406212754276", "value": "21"}
                        ]
                    }
                ]
            };
        csv = 'Device Id,Device Name,Component Id,Component Name,Component Type,Time Stamp,Value\n' +
                "testdevice01,Device 10,436e7e74-1111-1111-9057-26932f5eb7e1,Sensor 1,Temperature Sensor.v1.0,1406212541097,17\n" +
                "testdevice01,Device 10,436e7e74-1111-1111-9057-26932f5eb7e1,Sensor 1,Temperature Sensor.v1.0,1406212754276,21";
        mail = {
            subject: 'OISP measures - Intel(r) Corporation',
            attachments: [
                {
                    'filename': '0-1491040000000.csv',
                    'contents': null
                }
            ],
            email: "sample@email"
        };

        dataMock = {
            search: sinon.stub().callsArgWith(2, null, searchResponse),
            exportToCsv: sinon.stub().callsArgWith(2, null, searchResponse)
        };
        mailerMock = {
            send: sinon.stub()
        };
        usersAPIMock = {
            searchUser: sinon.stub().callsArgWith(1, null, user)
        };

        oldSearch = dataManager.search;
        dataManager.search = dataMock.search;

        dataManager.__set__('mailer', mailerMock);
        dataManager.__set__('UsersAPI', usersAPIMock);

    });

    afterEach(function() {
        // revert to previous implementation
        dataManager.search = oldSearch;
    });

    it('should export retrieved data in csv format', function (done) {
        // prepare

        // execute
        dataManager.exportToCsv(accountId, searchRequest, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(2);
        expect(callback.args[0][1].csv).to.equal(csv);

        done();
    });

    it('should not export if data is not retrieved', function (done) {
        // prepare
        error = errBuilder.Errors.Generic.InternalServerError;
        dataMock.search = sinon.stub().callsArgWith(2, error, null);
        dataManager.search = dataMock.search;

        // execute
        dataManager.exportToCsv(accountId, searchRequest, callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.getCall(0).args[0]).to.equal(error);

        done();
    });

    it('should send data in csv format by email to provided recipients', function (done) {
        // prepare
        searchRequest.recipients = ["sample@email"];
        delete searchResponse.series;
        searchResponse.csv = csv;
        user.accounts[accountId] = "admin";
        mail.attachments.contents = csv;
        var oldExportToCsv = dataManager.exportToCsv;
        dataManager.exportToCsv = dataMock.exportToCsv;

        // execute
        dataManager.sendByEmail(accountId, searchRequest, callback);

        // attest
        expect(dataManager.exportToCsv.calledOnce).to.equal(true);

        expect(mailerMock.send.calledOnce).to.equal(true);
        expect(mailerMock.send.args[0].length).to.equal(2);
        expect(mailerMock.send.args[0][0]).to.equal('measures');
        expect(mailerMock.send.args[0][1].subject).to.equal(mail.subject);
        expect(mailerMock.send.args[0][1].email).to.equal(mail.email);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(1);

        // revert
        dataManager.exportToCsv = oldExportToCsv;

        done();
    });
});
