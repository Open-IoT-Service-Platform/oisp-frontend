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
    httpStatuses = require('../../../../../engine/res/httpStatuses'),
    engineErrors = require('../../../../../engine/res/errors').Errors,
    dataHandler = rewire('../../../../../engine/handlers/v1/data');

describe('data handlers', function(){
    var reqMock,
        resMock,
        nextMock,
        dataAPIMock,
        responseCode;

    var expectResponseCode = function (httpCode) {
            expect(resMock.send.calledOnce).to.equal(true);
            expect(responseCode).to.eql(httpCode);
        },
        expectResponseCodeAndMessage = function (messageCode, results) {
            expect(resMock.send.calledOnce).to.equal(true);

            expect(responseCode).to.eql(messageCode);
            expect(resMock.send.calledWith(results)).to.eql(true);
        },
        expectErrorInNext = function (expectedError) {
            expect(nextMock.calledOnce).to.equal(true);
            expect(nextMock.args[0][0].status).to.equal(expectedError.status);
            expect(nextMock.args[0][0].code).to.equal(expectedError.code);
            expect(nextMock.args[0][0].message).to.equal(expectedError.message);
            expect(resMock.send.called).to.equal(false);
        };

    beforeEach( function () {
        reqMock = {
            iotDomain: {
                id: 1
            }
        };
        resMock = {
            send: sinon.spy(),
            setHeader: sinon.spy(),
            status: function(code) {
                responseCode = code;
                return this;
            }
        };
        nextMock = sinon.spy();
        dataAPIMock = {
            collectData: sinon.stub(),
            search: sinon.stub(),
            exportToCsv: sinon.stub(),
            sendByEmail: sinon.stub(),
            report: sinon.stub(),
            searchAdvanced: sinon.stub()
        };
        dataHandler.__set__('data', dataAPIMock);
    });

    describe('usage', function(){
        var validateResponseHeaderForUsage = function () {
                expect(resMock.setHeader.calledOnce).to.equal(true);
                expect(resMock.setHeader.args[0].length).to.equal(2);
                expect(resMock.setHeader.args[0][0]).to.equal('Access-Control-Allow-Methods');
                expect(resMock.setHeader.args[0][1]).to.equal('POST, OPTIONS');
            };

        it('should respond with httpStatuses.Ok.code', function(done){
            // execute
            dataHandler.usage(reqMock, resMock);

            // attest
            validateResponseHeaderForUsage();
            expectResponseCode(httpStatuses.OK.code);
            done();
        });
    });

    describe('collecting data', function(){
        beforeEach( function () {
            reqMock.params = {
                deviceId: 'device-1'
            };
            reqMock.headers = {
                forwarded: true
            };
            reqMock.body = {
                on: 1428068724,
                accountId: "12345678-abcd-abcd-abcd-987654321234",
                data: [
                    {
                        componentId: "436e7e74-6771-4898-9057-26932f5eb7e1_01",
                        on: 1354741966688,
                        loc: [ 45.5434085, -122.654422, 124.3 ],
                        value: "26.7"
                    }
                ]
            };
            reqMock.tokenInfo = {
                payload: {
                    type: 'device'
                }
            };
            reqMock.identity = 'identity';
        });

        describe('collect data', function(){
            var validateCollectDataAPICalledCorrectly = function () {
                var options = {
                    deviceId: reqMock.params.deviceId,
                    data: reqMock.body,
                    forwarded: reqMock.headers['forwarded'],
                    type: 'device',
                    isAdmin: false,
                    hasBinary: false,
                    identity: 'identity',
                };
                expect(dataAPIMock.collectData.calledOnce).to.equal(true);
                expect(dataAPIMock.collectData.args[0].length).to.equal(2);
                expect(dataAPIMock.collectData.args[0][0]).to.eql(options);
            };

            it('should respond with httpStatuses.Created.code if data was collected', function (done) {
                // prepare
                dataAPIMock.collectData.callsArgWith(1, null);

                // execute
                dataHandler.collectData(reqMock, resMock, {});

                // attest
                validateCollectDataAPICalledCorrectly();
                expectResponseCode(httpStatuses.Created.code);
                done();
            });

            it('should call next with error retrieved from API', function (done) {
                // prepare
                var error = engineErrors.Device.NotFound;
                dataAPIMock.collectData.callsArgWith(1, error);

                // execute
                dataHandler.collectData(reqMock, {}, nextMock);

                // attest
                validateCollectDataAPICalledCorrectly();
                expectErrorInNext(error);
                done();
            });
        });

        describe('collect data admin', function(){
            var validateCollectDataAdminAPICalledCorrectly = function () {
                var options = {
                    deviceId: reqMock.params.deviceId,
                    data: reqMock.body,
                    forwarded: reqMock.headers['forwarded'],
                    gatewayId: reqMock.params.deviceId,
                    isAdmin: true,
                    type: 'device'
                };
                expect(dataAPIMock.collectData.calledOnce).to.equal(true);
                expect(dataAPIMock.collectData.args[0].length).to.equal(2);
                expect(dataAPIMock.collectData.args[0][0]).to.eql(options);
            };

            it('should respond with httpStatuses.Created.code if data was collected', function(done){
                // prepare
                dataAPIMock.collectData.callsArgWith(1, null);

                // execute
                dataHandler.collectDataAdmin(reqMock, resMock, {});

                // attest
                validateCollectDataAdminAPICalledCorrectly();
                expectResponseCode(httpStatuses.Created.code);
                done();
            });

            it('should call next with error retrieved from API', function(done){
                // prepare
                var error = engineErrors.Device.NotFound;
                dataAPIMock.collectData.callsArgWith(1, error);

                // execute
                dataHandler.collectDataAdmin(reqMock, {}, nextMock);

                // attest
                validateCollectDataAdminAPICalledCorrectly();
                expectErrorInNext(error);
                done();
            });
        });
    });

    describe('search', function(){
        var errorResult = "Invalid request",
            errUnauthorized = 'EntityTooLarge',
            badRequest = 'BadRequest';

        beforeEach( function () {
            reqMock.params = {
                accountId: '12345678-abcd-abcd-abcd-987654321234'
            };
            reqMock.query = {};
            reqMock.body = {
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
        });

        describe('search without output parameter', function(){
            var results = {
                    "from": 1234567890,
                    "to": 1234567890,
                    "maxPoints": 100,
                    "series": [
                        {
                            "deviceId": "D1",
                            "deviceName": "D1",
                            "componentId": "e3a48caa-e4c5-46bb-951e-8f9d0a4be516",
                            "componentName": "temp",
                            "componentType": "temperature.v1.0",
                            "points": [
                                {"ts":9874569871, "value":25},
                                {"ts":9874569899, "value":24}
                            ]
                        }
                    ]
                };

            var validateSearchAPICalledCorrectly = function () {
                expect(dataAPIMock.search.calledOnce).to.equal(true);
                expect(dataAPIMock.search.args[0].length).to.equal(3);
                expect(dataAPIMock.search.args[0][0]).to.equal(reqMock.params.accountId);
                expect(dataAPIMock.search.args[0][1]).to.eql(reqMock.body);
                };

            it('should respond with httpStatuses.Ok.code and searched results', function (done) {
                // prepare
                dataAPIMock.search.callsArgWith(2, null, results);

                // execute
                dataHandler.searchData(reqMock, resMock, {});

                // attest
                validateSearchAPICalledCorrectly();
                expectResponseCodeAndMessage(httpStatuses.OK.code, results);
                done();
            });

            it('should respond with Invalid Request Error Code and results', function (done) {
                //prepare
                dataAPIMock.search.callsArgWith(2, badRequest, errorResult);

                // execute
                dataHandler.searchData(reqMock, resMock, {});

                // attest
                validateSearchAPICalledCorrectly();
                expectResponseCodeAndMessage(engineErrors.Generic.InvalidRequest.code, errorResult);
                done();
            });

            it('should respond with code of error from httpStatuses different then BadRequest', function(done){
                //prepare
                dataAPIMock.search.callsArgWith(2, errUnauthorized);

                // execute
                dataHandler.searchData(reqMock, resMock, {});

                // attest
                validateSearchAPICalledCorrectly();
                expectResponseCode(httpStatuses[errUnauthorized].code);
                done();
            });

            it('should call next with error retrieved from API', function(done){
                // prepare
                var error = engineErrors.Generic.AnalyticsError;
                dataAPIMock.search.callsArgWith(2, error);

                // execute
                dataHandler.searchData(reqMock, {}, nextMock);

                // attest
                validateSearchAPICalledCorrectly();
                expectErrorInNext(error);
                done();
            });
        });

        describe('search with output parameter === csv', function(){
            var csvResult = "Device Id,Device Name,Component Id,Component Name,Component Type,Time Stamp,Value\n" +
                "testdevice01,Device 10,436e7e74-1111-1111-9057-26932f5eb7e1,Temperature Sensor 1,temperature.v1.0,1369881520000,17\n" +
                "testdevice01,Device 10,436e7e74-1111-1111-9057-26932f5eb7e1,Temperature Sensor 1,temperature.v1.0,1369881520500,21";

            var validateExportToCsvAPICalledCorrectly = function () {
                    expect(dataAPIMock.exportToCsv.calledOnce).to.equal(true);
                    expect(dataAPIMock.exportToCsv.args[0].length).to.equal(3);
                    expect(dataAPIMock.exportToCsv.args[0][0]).to.equal(reqMock.params.accountId);
                    expect(dataAPIMock.exportToCsv.args[0][1]).to.eql(reqMock.body);
                },
                validateResponseHeaderForCsv = function () {
                    expect(resMock.setHeader.calledOnce).to.equal(true);
                    expect(resMock.setHeader.args[0].length).to.equal(2);
                    expect(resMock.setHeader.args[0][0]).to.equal("Content-Type");
                    expect(resMock.setHeader.args[0][1]).to.equal("text/csv; charset=utf-8");
                };

            beforeEach( function () {
                reqMock.query.output = 'csv';
            });

            it('should send back csv content with correct header', function(done) {
                //prepare
                dataAPIMock.exportToCsv.callsArgWith(2, null, { 'csv': csvResult});

                //execute
                dataHandler.searchData(reqMock, resMock, {});

                //attest
                validateExportToCsvAPICalledCorrectly();
                validateResponseHeaderForCsv();
                expectResponseCodeAndMessage(httpStatuses.OK.code, csvResult);
                done();
            });

            it('should respond with Invalid Request Error Code and results', function(done) {
                //prepare
                dataAPIMock.exportToCsv.callsArgWith(2, badRequest, errorResult);

                // execute
                dataHandler.searchData(reqMock, resMock, {});

                // attest
                validateExportToCsvAPICalledCorrectly();
                expectResponseCodeAndMessage(engineErrors.Generic.InvalidRequest.code, errorResult);
                done();
            });

            it('should respond with code of error from httpStatuses different then BadRequest', function(done) {
                //prepare
                dataAPIMock.exportToCsv.callsArgWith(2, errUnauthorized);

                // execute
                dataHandler.searchData(reqMock, resMock, {});

                // attest
                validateExportToCsvAPICalledCorrectly();
                expectResponseCode(httpStatuses[errUnauthorized].code);
                done();
            });

            it('should call next with error retrieved from API', function(done) {
                // prepare
                var error = engineErrors.Generic.AnalyticsError;
                dataAPIMock.exportToCsv.callsArgWith(2, error);

                // execute
                dataHandler.searchData(reqMock, {}, nextMock);

                // attest
                validateExportToCsvAPICalledCorrectly();
                expectErrorInNext(error);
                done();
            });
        });

        describe('search with output parameter === email', function(){
            var validateSendByEmailAPICalledCorrectly = function() {
                    expect(dataAPIMock.sendByEmail.calledOnce).to.equal(true);
                    expect(dataAPIMock.sendByEmail.args[0].length).to.equal(3);
                    expect(dataAPIMock.sendByEmail.args[0][0]).to.equal(reqMock.params.accountId);
                    expect(dataAPIMock.sendByEmail.args[0][1]).to.eql(reqMock.body);
                };

            beforeEach( function () {
                reqMock.query.output = 'email';
            });

            it('should execute sendByEmail function with correct arguments taken from request', function(done){
                //prepare
                dataAPIMock.sendByEmail.callsArgWith(2, null);

                //execute
                dataHandler.searchData(reqMock, resMock, {});

                //attest
                validateSendByEmailAPICalledCorrectly();
                expectResponseCode(httpStatuses.OK.code);
                done();
            });

            it('should respond with Invalid Request Error Code and results', function(done) {
                //prepare
                dataAPIMock.sendByEmail.callsArgWith(2, badRequest, errorResult);

                // execute
                dataHandler.searchData(reqMock, resMock, {});

                // attest
                validateSendByEmailAPICalledCorrectly();
                expectResponseCodeAndMessage(engineErrors.Generic.InvalidRequest.code, errorResult);
                done();
            });

            it('should respond with code of error from httpStatuses different then BadRequest', function(done) {
                //prepare
                dataAPIMock.sendByEmail.callsArgWith(2, errUnauthorized);

                // execute
                dataHandler.searchData(reqMock, resMock, {});

                // attest
                validateSendByEmailAPICalledCorrectly();
                expectResponseCode(httpStatuses[errUnauthorized].code);
                done();
            });

            it('should call next with error retrieved from API', function(done) {
                // prepare
                var error = engineErrors.Generic.AnalyticsError;
                dataAPIMock.sendByEmail.callsArgWith(2, error);

                // execute
                dataHandler.searchData(reqMock, {}, nextMock);

                // attest
                validateSendByEmailAPICalledCorrectly();
                expectErrorInNext(error);
                done();
            });
        });
    });

    describe('aggregated report', function() {
        var results = {
                "msgType": "aggregatedReportResponse",
                "columnHeaders": ["average"],
                "data": [
                    ["Temperature", "device-12345", "1407330000000", "-25", "-10", "-20"],
                    ["Temperature", "device-67890", "1407330000000", "0", "5.5", "4.33"],
                    ["Temperature", "device-12345", "1407340000000", "-20", "-9", "-17.5"],
                    ["Temperature", "device-67890", "1407340000000", "0", "5.5", "4.33"]
                ],
                "aggregatedDataStartTimestamp": 0,
                "aggregatedDataEndTimestamp": 1491039999960
            },
            builderError = "Build Error",
            errBuilderMock;

        var validateResponseHeaderForAggregatedReport = function () {
                expect(resMock.setHeader.calledOnce).to.equal(true);
                expect(resMock.setHeader.args[0].length).to.equal(2);
                expect(resMock.setHeader.args[0][0]).to.equal("Content-Type");
                expect(resMock.setHeader.args[0][1]).to.equal("application/json; charset=utf-8");
            },
            validateReportAPICalledCorrectly = function () {
                expect(dataAPIMock.report.calledOnce).to.equal(true);
                expect(dataAPIMock.report.args[0].length).to.equal(3);
                expect(dataAPIMock.report.args[0][0]).to.equal(reqMock.params.accountId);
                expect(dataAPIMock.report.args[0][1]).to.eql(reqMock.body);
            },
            validateErrBuilderMockCalledCorrectly = function () {
                expect(errBuilderMock.build.calledOnce).to.equal(true);
                expect(errBuilderMock.build.args[0].length).to.equal(2);
                expect(errBuilderMock.build.args[0][0]).to.eql(engineErrors.Generic.InvalidRequest);
                expect(errBuilderMock.build.args[0][1]).to.eql([engineErrors.Data.OffsetAndLimitBothOrNoneRequired]);
            };

        beforeEach( function () {
            reqMock.params = {
                accountId: "12345678-abcd-abcd-abcd-987654321234"
            };
            reqMock.body = {
                "from": 0,
                "to": 1491040000000,
                "aggregationMethods": "average"
            };
            errBuilderMock = {
                build: sinon.stub().returns(builderError),
                Errors: {
                    Generic: {
                        InvalidRequest: engineErrors.Generic.InvalidRequest
                    },
                    Data: {
                        OffsetAndLimitBothOrNoneRequired: engineErrors.Data.OffsetAndLimitBothOrNoneRequired
                    }
                }
            };
        });

        it('should respond with httpStatuses.OK.code and aggregated report results', function(done) {
            //prepare
            dataAPIMock.report.callsArgWith(2, null, results);

            //execute
            dataHandler.aggregatedReport(reqMock, resMock, {});

            //attest
            validateResponseHeaderForAggregatedReport();
            validateReportAPICalledCorrectly();
            expectResponseCodeAndMessage(httpStatuses.OK.code, results);
            done();
        });

        it('should respond with InvalidRequest code and OffsetAndLimitBothOrNoneRequired error if offset but no limit parameter was defined', function(done) {
            //prepare
            reqMock.body.offset = 100;
            dataHandler.__set__('errBuilder', errBuilderMock);

            //execute
            dataHandler.aggregatedReport(reqMock, resMock, {});

            //attest
            validateResponseHeaderForAggregatedReport();
            validateErrBuilderMockCalledCorrectly();
            expectResponseCodeAndMessage(engineErrors.Generic.InvalidRequest.code, builderError);
            done();
        });

        it('should respond with InvalidRequest code and OffsetAndLimitBothOrNoneRequired error if limit but no offset parameter was defined', function(done) {
            //prepare
            reqMock.body.limit = 10;
            dataHandler.__set__('errBuilder', errBuilderMock);

            //execute
            dataHandler.aggregatedReport(reqMock, resMock, {});

            //attest
            validateResponseHeaderForAggregatedReport();
            validateErrBuilderMockCalledCorrectly();
            expectResponseCodeAndMessage(engineErrors.Generic.InvalidRequest.code, builderError);
            done();

        });

        it('should respond Invalid Request code and error', function(done) {
            //prepare
            var error = {
                statusCode: engineErrors.Generic.InvalidRequest.code
            };
            dataAPIMock.report.callsArgWith(2,error);

            //execute
            dataHandler.aggregatedReport(reqMock, resMock, {});

            //attest
            validateResponseHeaderForAggregatedReport();
            validateReportAPICalledCorrectly();
            expectResponseCodeAndMessage(engineErrors.Generic.InvalidRequest.code, error);
            done();
        });

        it('should call next with error retrieved from API', function(done) {
            // prepare
            var error = engineErrors.Generic.AnalyticsError;
            dataAPIMock.report.callsArgWith(2, error);

            // execute
            dataHandler.aggregatedReport(reqMock, resMock, nextMock);

            // attest
            validateResponseHeaderForAggregatedReport();
            validateReportAPICalledCorrectly();
            expectErrorInNext(error);
            done();
        });
    });

    describe('search data advanced', function() {
        var results = "Proper results with searched data",
            errorResult = "Invalid request",
            errUnauthorized = 'EntityTooLarge',
            badRequest = 'BadRequest';

        var validateReportAPICalledCorrectly = function () {
            expect(dataAPIMock.searchAdvanced.calledOnce).to.equal(true);
            expect(dataAPIMock.searchAdvanced.args[0].length).to.equal(3);
            expect(dataAPIMock.searchAdvanced.args[0][0]).to.equal(reqMock.params.accountId);
            expect(dataAPIMock.searchAdvanced.args[0][1]).to.eql(reqMock.body);
        };

        beforeEach( function () {
            reqMock.params = {
                accountId: "12345678-abcd-abcd-abcd-987654321234"
            };
            reqMock.body = {
                "deviceIds": ["Device01"],
                "componentIds": ["436e7e74-1111-1111-9057-26932f5eb7e1"],
                "from": 0,
                "to": 1491040000000
            };
        });

        it('should respond with httpStatuses.OK.code and searched results', function(done) {
            //prepare
            dataAPIMock.searchAdvanced.callsArgWith(2, null, results);

            //execute
            dataHandler.searchDataAdvanced(reqMock, resMock, {});

            //attest
            validateReportAPICalledCorrectly();
            expectResponseCodeAndMessage(httpStatuses.OK.code, results);
            done();
        });

        it('should respond with Invalid Request Error Code and results', function(done) {
            //prepare
            dataAPIMock.searchAdvanced.callsArgWith(2, badRequest, errorResult);

            // execute
            dataHandler.searchDataAdvanced(reqMock, resMock, {});

            // attest
            validateReportAPICalledCorrectly();
            expectResponseCodeAndMessage(engineErrors.Generic.InvalidRequest.code, errorResult);
            done();
        });

        it('should respond with code of error from httpStatuses different then BadRequest', function(done){
            //prepare
            dataAPIMock.searchAdvanced.callsArgWith(2, errUnauthorized);

            // execute
            dataHandler.searchDataAdvanced(reqMock, resMock, {});

            // attest
            validateReportAPICalledCorrectly();
            expectResponseCode(httpStatuses[errUnauthorized].code);
            done();
        });

        it('should call next with error retrieved from API', function(done){
            // prepare
            var error = engineErrors.Generic.AnalyticsError;
            dataAPIMock.searchAdvanced.callsArgWith(2, error);

            // execute
            dataHandler.searchDataAdvanced(reqMock, {}, nextMock);

            // attest
            validateReportAPICalledCorrectly();
            expectErrorInNext(error);
            done();
        });
    });
});
