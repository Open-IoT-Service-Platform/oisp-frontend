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
    uuid = require('node-uuid'),
    alertsHandler = rewire('../../../../../engine/handlers/v1/alerts'),
    httpStatuses = require('../../../../../engine/res/httpStatuses');

describe('alerts handler', function() {
    var responseCode;
    var reqMock = {
            forwardedHeaders: {
                baseUrl: 'https://dashboard.enableiot.com'
            },
            query: {},
            params: {
                alertId: 123,
                accountId: uuid.v4(),
                status: 'Closed'
            }
        },
        resMock,
        errorCode = 500;

    var initResponseMock = function() {
        responseCode = null;
        resMock = {
            send: sinon.spy(),
            status: function(code) {
                responseCode = code;
                return this;
            }
        }
    };

    describe('add comments', function(){
        beforeEach(function() {
            initResponseMock();
        });

        it('should add comment and return 200 if request is valid and alert exists', function(done){
            // prepare
            var comments = [
                    {
                        user: 'user1@test.com',
                        timestamp: Date.now(),
                        text: 'comment1'
                    },
                    {
                        user: 'user1@test.com',
                        timestamp: Date.now(),
                        text: 'comment2'
                    }
                ],
                apiMock = {
                    addComments: sinon.stub().callsArgWith(1, null)
                };
            reqMock.body = comments;

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.addComments(reqMock, resMock, {});

            // attest
            expect(resMock.send.calledOnce).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(apiMock.addComments.calledOnce).to.equal(true);
            expect(apiMock.addComments.args[0].length).to.equal(2);

            var actual = apiMock.addComments.args[0][0];
            expect(actual.length).to.equal(2);
            expect(actual[0]).to.eql({alertId: reqMock.params.alertId, text: 'comment1', user: 'user1@test.com'});
            expect(actual[1]).to.eql({alertId: reqMock.params.alertId, text: 'comment2', user: 'user1@test.com'});

            done();
        });

        it('should not add comment if something crashes and should return error code', function(done){
            // prepare
            var comments = [
                    {
                        user: 'user1@test.com',
                        timestamp: Date.now(),
                        text: 'comment1'
                    },
                    {
                        user: 'user1@test.com',
                        timestamp: Date.now(),
                        text: 'comment2'
                    }
                ],
                error = new Error(errorCode),
                apiMock = {
                    addComments: sinon.stub().callsArgWith(1, error)
                },
                nextSpy = sinon.spy();

            reqMock.body = comments;

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.addComments(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);
            expect(apiMock.addComments.calledOnce).to.equal(true);

            var actual = apiMock.addComments.args[0][0];
            expect(actual.length).to.equal(2);
            expect(actual[0]).to.eql({alertId: reqMock.params.alertId, text: 'comment1', user: 'user1@test.com'});
            expect(actual[1]).to.eql({alertId: reqMock.params.alertId, text: 'comment2', user: 'user1@test.com'});

            done();
        });

    });
    describe('get unread alerts', function(){
        beforeEach(function() {
            initResponseMock();
        });

        var localreqMock = {
                forwardedHeaders: {
                    baseUrl: 'https://dashboard.enableiot.com'
                },
                query: {status:'New'},
                params: {
                    alertId: 123,
                    accountId: uuid.v4(),
                    status: ''
                }
            };

        var params = {
            accountId: localreqMock.params.accountId,
            status:'New'
        };

        it('should get list of alerts for account and return OK if request is valid and account exists', function(done){
            // prepare
            var alertsRes = [
                    {
                        alertId: '123'
                    },
                    {
                        alertId: '124'
                    }
                ],
                apiMock = {
                    getUnreadAlerts: sinon.stub().callsArgWith(1, null, alertsRes)
                };

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.getUnreadAlerts(localreqMock, resMock, {});

            // attest
            expect(resMock.send.calledWith(alertsRes)).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(apiMock.getUnreadAlerts.calledOnce).to.equal(true);
            expect(apiMock.getUnreadAlerts.args[0].length).to.equal(2);
            expect(apiMock.getUnreadAlerts.calledWith(params)).to.equal(true);

            done();
        });
        it('should not get list of alerts if something crashes and should return error code', function(done){
            // prepare
            var error = new Error(errorCode),
                apiMock = {
                    getUnreadAlerts: sinon.stub().callsArgWith(1, error, null)
                },
                nextSpy = sinon.spy();

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.getUnreadAlerts(localreqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);
            expect(apiMock.getUnreadAlerts.calledOnce).to.equal(true);
            expect(apiMock.getUnreadAlerts.calledWith(params)).to.equal(true);

            done();
        });
    });
    describe('get alert', function(){
        beforeEach(function() {
            initResponseMock();
        });

        var params = {
            accountId: reqMock.params.accountId,
            alertId: 123
        };

        it('should get alert information if alert exists and request is valid', function(done){
            // prepare
            var alertRes = {
                    alertId: 123
                },
                apiMock = {
                    getAlert: sinon.stub().callsArgWith(1, null, alertRes)
                };

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.getAlert(reqMock, resMock, {});

            // attest
            expect(resMock.send.calledWith(alertRes)).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(apiMock.getAlert.calledOnce).to.equal(true);
            expect(apiMock.getAlert.args[0].length).to.equal(2);
            expect(apiMock.getAlert.calledWith(params)).to.equal(true);

            done();
        });
        it('should not get alert information if something crashes and should return error code', function(done){
            // prepare
            var error = new Error(errorCode),
                apiMock = {
                    getAlert: sinon.stub().callsArgWith(1, error, null)
                },
                nextSpy = sinon.spy();

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.getAlert(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);
            expect(apiMock.getAlert.calledOnce).to.equal(true);
            expect(apiMock.getAlert.calledWith(params)).to.equal(true);

            done();
        });
    });
    describe('get alerts', function(){
        beforeEach(function() {
            initResponseMock();
        });

        var params = {
            accountId: reqMock.params.accountId
        };

        it('should get list of alerts for account and return OK if request is valid and account exists', function(done){
            // prepare
            var alertsRes = [
                    {
                        alertId: '123'
                    },
                    {
                        alertId: '124'
                    }
                ],
                apiMock = {
                    getAlerts: sinon.stub().callsArgWith(1, null, alertsRes)
                };

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.getAlerts(reqMock, resMock, {});

            // attest
            expect(resMock.send.calledWith(alertsRes)).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(apiMock.getAlerts.calledOnce).to.equal(true);
            expect(apiMock.getAlerts.args[0].length).to.equal(2);
            expect(apiMock.getAlerts.calledWith(params)).to.equal(true);

            done();
        });
        it('should not get list of alerts if something crashes and should return error code', function(done){
            // prepare
            var error = new Error(errorCode),
                apiMock = {
                    getAlerts: sinon.stub().callsArgWith(1, error, null)
                },
                nextSpy = sinon.spy();

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.getAlerts(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);
            expect(apiMock.getAlerts.calledOnce).to.equal(true);
            expect(apiMock.getAlerts.calledWith(params)).to.equal(true);

            done();
        });
    });
    describe('delete alert', function(){
        beforeEach(function() {
            initResponseMock();
        });

        var params = {
            alertId: reqMock.params.alertId,
            accountId: reqMock.params.accountId
        };

        it('should delete alert and return 204', function(done){
            // prepare
            var apiMock = {
                deleteAlert: sinon.stub().callsArgWith(1, null)
                };

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.deleteAlert(reqMock, resMock, {});

            // attest
            expect(resMock.send.calledOnce).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.DeleteOK.code);
            expect(apiMock.deleteAlert.calledOnce).to.equal(true);
            expect(apiMock.deleteAlert.args[0].length).to.equal(2);
            expect(apiMock.deleteAlert.calledWith(params)).to.equal(true);

            done();
        });
        it('should not delete alert if something crashes and should return 404 error code', function(done){
            // prepare
            var error = new Error(404),
                apiMock = {
                    deleteAlert: sinon.stub().callsArgWith(1, error)
                },
                nextSpy = sinon.spy();

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.deleteAlert(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);
            expect(apiMock.deleteAlert.calledOnce).to.equal(true);
            expect(apiMock.deleteAlert.calledWith(params)).to.equal(true);

            done();
        });
    });
    describe('delete alerts', function(){
        beforeEach(function() {
            initResponseMock();
        });

        var params = {
            accountId: reqMock.params.accountId
        };

        it('should delete alerts for account and return 204', function(done){
            // prepare
            var apiMock = {
                deleteAlerts: sinon.stub().callsArgWith(1, null)
                };

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.deleteAlerts(reqMock, resMock, {});

            // attest
            expect(resMock.send.calledOnce).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.DeleteOK.code);
            expect(apiMock.deleteAlerts.calledOnce).to.equal(true);
            expect(apiMock.deleteAlerts.args[0].length).to.equal(2);
            expect(apiMock.deleteAlerts.calledWith(params)).to.equal(true);

            done();
        });
        it('should not delete alerts if something crashes and should return 404 error code', function(done){
            // prepare
            var error = new Error(404),
                apiMock = {
                    deleteAlerts: sinon.stub().callsArgWith(1, error)
                },
                nextSpy = sinon.spy();

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.deleteAlerts(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);
            expect(apiMock.deleteAlerts.calledOnce).to.equal(true);
            expect(apiMock.deleteAlerts.calledWith(params)).to.equal(true);

            done();
        });
    });
    describe('bulk reset', function(){
        beforeEach(function() {
            initResponseMock();
        });

        it('should call callback with 200 if request is valid and alert exists', function(done){
            // prepare
            var apiMock = {
                    bulkReset: sinon.stub().callsArgWith(1, null, [])
                };
            reqMock.body = {
                data: {
                    accountId: uuid.v4(),
                    alertId: 123,
                    timestamp: Date.now()
                }
            };
            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.bulkReset(reqMock, resMock, {});

            // attest
            expect(resMock.send.calledOnce).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(apiMock.bulkReset.calledOnce).to.equal(true);
            expect(apiMock.bulkReset.args[0].length).to.equal(2);
            expect(apiMock.bulkReset.calledWith(reqMock.body.data)).to.equal(true);

            done();
        });
        it('should call callback with error if something crashes and should return error code', function(done){
            // prepare
            var error = new Error(errorCode),
                apiMock = {
                    bulkReset: sinon.stub().callsArgWith(1, error, null)
                },
                nextSpy = sinon.spy();

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.bulkReset(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);
            expect(apiMock.bulkReset.calledOnce).to.equal(true);
            expect(apiMock.bulkReset.calledWith(reqMock.body.data)).to.equal(true);

            done();
        });
    });
    describe('change status', function(){
        beforeEach(function() {
            initResponseMock();
        });
        var params = {
            accountId: reqMock.params.accountId,
            alertId: reqMock.params.alertId,
            status: 'Closed'
        };
        it('should change status of alert if request is valid and alert exists', function(done){
            // prepare
            var apiMock = {
                    changeStatus: sinon.stub().callsArgWith(1, null)
                };

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.changeStatus(reqMock, resMock, {});

            // attest
            expect(resMock.send.calledOnce).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(apiMock.changeStatus.calledOnce).to.equal(true);
            expect(apiMock.changeStatus.args[0].length).to.equal(2);
            expect(apiMock.changeStatus.calledWith(params)).to.equal(true);

            done();
        });
        it('should not change alert status if something crashes and should return error code', function(done){
            // prepare
            var error = new Error(errorCode),
                apiMock = {
                    changeStatus: sinon.stub().callsArgWith(1, error)
                },
                nextSpy = sinon.spy();

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.changeStatus(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);
            expect(apiMock.changeStatus.calledOnce).to.equal(true);
            expect(apiMock.changeStatus.calledWith(params)).to.equal(true);

            done();
        });
    });
    describe('reset', function(){
        beforeEach(function() {
            initResponseMock();
        });
        var params = {
            accountId: reqMock.params.accountId,
            alertId: reqMock.params.alertId
        }
        it('should reset alert if request is valid and account with alert exist', function(done){
            // prepare
            var apiMock = {
                reset: sinon.stub().callsArgWith(1, null)
            };

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.reset(reqMock, resMock, {});

            // attest
            expect(resMock.send.calledOnce).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(apiMock.reset.calledOnce).to.equal(true);
            expect(apiMock.reset.args[0].length).to.equal(2);
            expect(apiMock.reset.calledWith(params)).to.equal(true);

            done();
        });
        it('should not reset alert if something crashes and return error code', function(done){
            // prepare
            var error = new Error(errorCode),
                apiMock = {
                    reset: sinon.stub().callsArgWith(1, error)
                },
                nextSpy = sinon.spy();

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.reset(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);
            expect(apiMock.reset.calledOnce).to.equal(true);
            expect(apiMock.reset.calledWith(params)).to.equal(true);

            done();
        });
    });
    describe('trigger', function(){
        beforeEach(function() {
            initResponseMock();
        });
        it('should call callback with 200 if everything is ok', function(done){
            // prepare
            var apiMock = {
                trigger: sinon.stub().callsArgWith(3, null, [])
            };
            reqMock.body.data = [
                {
                    accountId: reqMock.params.accountId,
                    ruleId: 1
                }
            ];

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.trigger(reqMock, resMock, {});

            // attest
            expect(resMock.send.calledOnce).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(apiMock.trigger.calledOnce).to.equal(true);
            expect(apiMock.trigger.args[0].length).to.equal(4);
            expect(apiMock.trigger.calledWith(reqMock.body.data)).to.equal(true);

            done();
        });
        it('should call callback with error if something crashes', function(done){
            // prepare
            var error = new Error(errorCode),
                apiMock = {
                    trigger: sinon.stub().callsArgWith(3, error, null)
                },
                nextSpy = sinon.spy();

            alertsHandler.__set__('alert', apiMock);

            // execute
            alertsHandler.trigger(reqMock, {}, nextSpy);

            // attest
            expect(nextSpy.calledWith(error)).to.equal(true);
            expect(apiMock.trigger.calledOnce).to.equal(true);
            expect(apiMock.trigger.calledWith(reqMock.body.data)).to.equal(true);

            done();
        });
    });
});
