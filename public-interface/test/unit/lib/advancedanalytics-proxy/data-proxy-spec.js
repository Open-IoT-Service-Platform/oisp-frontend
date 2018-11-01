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
var assert = require('chai').assert,
    expect = require('expect.js'),
    rewire = require('rewire'),
    config = require('./../../../../config').drsProxy,
    sinon = require('sinon'),
    DataProxy = rewire('./../../../../lib/advancedanalytics-proxy/data-proxy'),
    errBuilder = require('../../../../lib/errorHandler/errorHandler').errBuilder,
    responses = require('../../../../lib/advancedanalytics-proxy/utils/responses'),
    uuid = require('node-uuid');

describe('Data proxy', function() {
    var con, MQTT, data;

    beforeEach(function() {

         con = {
             publish: function (topic, message) {
                 assert.equal(topic, "server/metric/" + data.domainId + "/" + data.gatewayId, "The Public Domain is not at topic");
                 assert.isObject(message, "It is expected a object");
                 assert.equal(message.accountId, data.domainId, "Missing the account ID at message");
                 assert.equal(message.did, data.deviceId, "Missing the account ID at message");
                 assert.equal(message.did, data.deviceId, "Missing the account ID at message");
                 assert.lengthOf(message.data, 2, "The data payload were wrong formed");
                 assert.equal(message.count, 2, "The length of the data where wrong formed");
                 bvassert.equal(message.on, data.on, "Missing the on time");
           }
        };
        MQTT = {
            Broker: function () {
                return con;
            }
        };
        DataProxy.__set__('MQTTConnector', MQTT);
    });

    describe('Data inquiry advanced', function () {

        it('should pass received data if status code is 200', function (done) {

            // prepare
            var data = {},
                res = {
                    statusCode: 200,
                    body: JSON.stringify({report: "data"})
                },
                reqestMock = sinon.stub().callsArgWith(1, null, res),
                callback = sinon.spy();

            DataProxy.__set__('request', reqestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.dataInquiryAdvanced(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.args[0].length).to.equal(2);
            expect(callback.args[0][0]).to.equal(null);
            expect(JSON.stringify(callback.args[0][1])).to.equal(res.body);

            done();
        });

        it('should not pass data if entity-too-large response retrieved', function (done) {

            // prepare
            var data = {},
                res = {
                    statusCode: responses.Errors.EntityToLarge
                },
                reqestMock = sinon.stub().callsArgWith(1, null, res),
                callback = sinon.spy();

            DataProxy.__set__('request', reqestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.dataInquiryAdvanced(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.getCall(0).args[0]).to.equal("EntityTooLarge");

            done();
        });

        it('should not pass data if cannot parse response body', function (done) {

            // prepare
            var data = {},
                res = {
                    statusCode: responses.Success.OK,
                    body: {report: "data"}
                },
                reqestMock = sinon.stub().callsArgWith(1, null, res),
                callback = sinon.spy();

            DataProxy.__set__('request', reqestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.dataInquiryAdvanced(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(JSON.stringify(callback.getCall(0).args[0])).to.equal(JSON.stringify({message: 'Could not parse AA response'}));

            done();
        });

        it('should pass received error if status code is 400', function (done) {

            // prepare
            var data = {},
                errorMessage = "['error description']",
                res = {
                    statusCode: 400,
                    body: JSON.stringify({
                        errors:[{
                            msgType: 'errorResponse',
                            errorCode: 400,
                            errorMessage: errorMessage
                        }]

                    })
                },
                reqestMock = sinon.stub().callsArgWith(1, null, res),
                callback = sinon.spy();

            DataProxy.__set__('request', reqestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.dataInquiryAdvanced(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.args[0].length).to.equal(2);
            expect(callback.args[0][0]).to.equal("BadRequest");
            expect(callback.args[0][1]).to.have.string(errorMessage);

            done();
        });

        it('should send generic error if status code is 500', function (done) {

            // prepare
            var data = {},
                res = {
                    statusCode: 500,
                    body: 'Tomcat error report'
                },
                reqestMock = sinon.stub().callsArgWith(1, null, res),
                callback = sinon.spy();

            DataProxy.__set__('request', reqestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.dataInquiryAdvanced(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.args[0].length).to.equal(1);
            expect(JSON.stringify(callback.args[0][0])).to.equal(JSON.stringify({message: 'error receiving data'}));

            done();
        });

    });

    describe('Report', function () {

        it('should pass received data if status code is 200', function (done) {

            // prepare
            var data = {},
                res = {
                    statusCode: 200,
                    body: {'report': 'data'}
                },
                reqestMock = sinon.stub().callsArgWith(1, null, res),
                callback = sinon.spy();

            DataProxy.__set__('request', reqestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.report(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.args[0].length).to.equal(2);
            expect(callback.args[0][0]).to.equal(null);
            expect(callback.args[0][1]).to.equal(res.body);

            done();
        });

        it('should pass received error if status code is 400', function (done) {

            // prepare
            var data = {},
                res = {
                    statusCode: 400,
                    body: {
                        msgType: 'errorResponse',
                        errors: [
                            {
                                errorCode: 1000,
                                errorMessage: 'error description'
                            }
                        ]
                    }
                },
                reqestMock = sinon.stub().callsArgWith(1, null, res),
                callback = sinon.spy();

            DataProxy.__set__('request', reqestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.report(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.args[0].length).to.equal(1);
            expect(callback.args[0][0].body.errors.length).to.equal(1);
            expect(callback.args[0][0].body.errors[0].errorMessage).to.equal(res.body.errors[0].errorMessage);

            done();
        });

        it('should send generic error if status code is 500', function (done) {

            // prepare
            var data = {},
                res = {
                    statusCode: 500,
                    body: 'Tomcat error report'
                },
                reqestMock = sinon.stub().callsArgWith(1, null, res),
                callback = sinon.spy();

            DataProxy.__set__('request', reqestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.report(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.args[0].length).to.equal(1);
            expect(JSON.stringify(callback.args[0][0])).to.equal(JSON.stringify({message: 'error receiving data'}));

            done();
        });
    });

    describe('submitDataKafka', function () {

        var dataProxy,
            callback,
            data,
            KafkaHLProducerMock,
            KafkaClientMock,
            MetricMock;

        beforeEach(function() {
            config.ingestion = 'Kafka';
            callback = sinon.spy();
            data = {};
            KafkaHLProducerMock = sinon.stub().returns(
                {
                    send: sinon.stub().callsArgWith(1, null, null)
                }
            );
            KafkaClientMock = sinon.stub().returns({});
            DataProxy.__set__('KafkaHLProducer', KafkaHLProducerMock);
            DataProxy.__set__('KafkaClient', KafkaClientMock);
            dataProxy = new DataProxy(config);
        });

        it('should submit data if everything is ok', function (done) {

            // prepare
            dataProxy.submitDataKafka(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.calledWith(null)).to.equal(true);

            done();
        });

        it('should not submit data and return error if exception thrown while message creation', function (done) {

            // prepare
            var error = errBuilder.build(errBuilder.Errors.Data.SubmissionError);
        	var errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
            MetricMock = {
                prepareDataIngestionMsg: sinon.stub().throws(error)
            };
            DataProxy.__set__('Metric', MetricMock);


            // execute
            dataProxy.submitDataKafka(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.calledWith(sinon.match(errorObj))).to.equal(true);

            done();
        });

        it('should not submit data and return error if kafka failed', function (done) {
            // prepare
            var error = errBuilder.build(errBuilder.Errors.Data.SubmissionError);
            var errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
            KafkaHLProducerMock = sinon.stub().returns(
                {
                    send: sinon.stub().callsArgWith(1, error, null)
                }
            );
            DataProxy.__set__('KafkaHLProducer', KafkaHLProducerMock);
            dataProxy = new DataProxy(config);

            // execute
            dataProxy.submitDataKafka(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.calledWith(sinon.match(errorObj))).to.equal(true);

            done();
        });
    });

    describe('dataInquiry', function () {

        it('should get data if response from AA is retrieved', function (done) {

            // prepare
            var data = {
                    queryMeasureLocation: "location",
                    domainId: uuid.v4()
                },
                callback = sinon.spy(),
                res = {
                    statusCode: responses.Success.OK,
                    body: JSON.stringify({data: {}})
                },
                requestMock = sinon.stub().callsArgWith(1, null, res);
            DataProxy.__set__('request', requestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.dataInquiry(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.getCall(0).args[0]).to.equal(null);
            expect(JSON.stringify(callback.getCall(0).args[1])).to.equal(res.body);

            done();
        });

        it('should get data if no-content response from AA is retrieved', function (done) {

            // prepare
            var data = {
                    queryMeasureLocation: "location",
                    domainId: uuid.v4()
                },
                callback = sinon.spy(),
                res = {
                    statusCode: responses.Success.NoContent
                },
                requestMock = sinon.stub().callsArgWith(1, null, res);
            DataProxy.__set__('request', requestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.dataInquiry(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.getCall(0).args[0]).to.equal(null);
            expect(JSON.stringify(callback.getCall(0).args[1])).to.equal(JSON.stringify({"components": []}));

            done();
        });

        it('should return error if bad response from AA is retrieved', function (done) {

            // prepare
            var data = {
                    queryMeasureLocation: "location",
                    domainId: uuid.v4()
                },
                callback = sinon.spy(),
                res = {
                    statusCode: responses.Errors.BadRequest,
                    body: {errors: [{errorMessage: "BadResponse"}]}
                },
                requestMock = sinon.stub().callsArgWith(1, null, res);
            DataProxy.__set__('request', requestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.dataInquiry(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.getCall(0).args[0].message).to.equal("Could not parse AA response");

            done();
        });

        it('should return error if EntityToLarge response from AA is retrieved', function (done) {

            // prepare
            var data = {
                    queryMeasureLocation: "location",
                    domainId: uuid.v4()
                },
                callback = sinon.spy(),
                res = {
                    statusCode: responses.Errors.EntityToLarge
                },
                requestMock = sinon.stub().callsArgWith(1, null, res);
            DataProxy.__set__('request', requestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.dataInquiry(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.getCall(0).args[0]).to.equal("EntityTooLarge");

            done();
        });

        it('should return error if something crashes', function (done) {

            // prepare
            var data = {
                    queryMeasureLocation: "location",
                    domainId: uuid.v4()
                },
                callback = sinon.spy(),
                requestMock = sinon.stub().callsArgWith(1, {}, null);
            DataProxy.__set__('request', requestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.dataInquiry(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(JSON.stringify(callback.getCall(0).args[0])).to.equal(JSON.stringify({message: 'error receiving data'}));

            done();
        });

        it('should return error if cannot parse response body', function (done) {

            // prepare
            var data = {
                    queryMeasureLocation: "location",
                    domainId: uuid.v4()
                },
                callback = sinon.spy(),
                res = {
                    statusCode: responses.Success.OK,
                    body: {
                        data: {}
                    }
                },
                requestMock = sinon.stub().callsArgWith(1, null, res);
            DataProxy.__set__('request', requestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.dataInquiry(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(JSON.stringify(callback.getCall(0).args[0])).to.equal(JSON.stringify({message: 'Could not parse AA response'}));

            done();
        });
    });

    describe('getFirstAndLastMeasurement', function () {

        it('should get data if response from AA is retrieved', function (done) {
            // prepare
            var data = {
                    domainId: uuid.v4()
                },
                callback = sinon.spy(),
                res = {
                    statusCode: responses.Success.OK,
                    body: {data: {}}
                },
                requestMock = sinon.stub().callsArgWith(1, null, res);
            DataProxy.__set__('request', requestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.getFirstAndLastMeasurement(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.getCall(0).args[0]).to.equal(null);
            expect(callback.getCall(0).args[1]).to.equal(res.body);

            done();
        });

        it('should get empty response body if no-content response from AA is retrieved', function (done) {

            // prepare
            var data = {
                    domainId: uuid.v4()
                },
                callback = sinon.spy(),
                res = {
                    statusCode: responses.Success.NoContent
                },
                requestMock = sinon.stub().callsArgWith(1, null, res);
            DataProxy.__set__('request', requestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.getFirstAndLastMeasurement(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.getCall(0).args[0]).to.equal(null);
            expect(JSON.stringify(callback.getCall(0).args[1])).to.equal(JSON.stringify({"componentsFirstLast": []}));

            done();
        });

        it('should return error if bad request', function (done) {
            // prepare
            var data = {
                    queryMeasureLocation: "location",
                    domainId: uuid.v4()
                },
                callback = sinon.spy(),
                res = {
                    statusCode: responses.Errors.BadRequest,
                    body: "error body"
                },
                error = res,
                requestMock = sinon.stub().callsArgWith(1, null, res);
            DataProxy.__set__('request', requestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.getFirstAndLastMeasurement(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(JSON.stringify(callback.getCall(0).args[0])).to.equal(JSON.stringify(error));

            done();
        });

        it('should return error if something crashes', function (done) {
            // prepare
            var data = {
                    queryMeasureLocation: "location",
                    domainId: uuid.v4()
                },
                callback = sinon.spy(),
                error = errBuilder.Errors.Generic.InternalServerError,
                requestMock = sinon.stub().callsArgWith(1, error, null);
            DataProxy.__set__('request', requestMock);

            // execute
            var dataProxy = new DataProxy(config);
            dataProxy.getFirstAndLastMeasurement(data, callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(JSON.stringify(callback.getCall(0).args[0])).to.equal(JSON.stringify({message: 'error receiving data'}));

            done();
        });
    });

    describe('data-proxy-exports', function () {
        it('should throw exception if kafka client or producer cannot be created', function (done) {
            // prepare
            var KafkaClientMock = sinon.stub().throws(),
                KafkaHLProducerMock = sinon.stub().throws(),
                loggerMock = {
                    error: sinon.spy()
                };
            DataProxy.__set__('logger', loggerMock);
            DataProxy.__set__('KafkaClient', KafkaClientMock);
            DataProxy.__set__('KafkaHLProducer', KafkaHLProducerMock);
            // execute
            new DataProxy(config);

            // attest
            expect(loggerMock.error.calledTwice).to.equal(true);

            done();
        });
    });
});
