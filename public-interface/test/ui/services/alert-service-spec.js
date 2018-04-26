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
describe('alerts service', function(){
    var service,
        httpBackend,
        alerts = [
            {
                alertId:1
            },
            {
                alertId:2
            }
        ],
        error = {
            code: 500,
            message: 'internal server error'
        },
        internalError = {
            code: 500,
            message: 'internal server error'
        },
        accountId = 1;

    beforeEach(function(){
        module('iotServices');

        var sessionServiceMock = {
            url: '',
            then : function(callback){
              callback(this.url)
            },
            addAccountIdPrefix : function(url){
                this.url = '/accounts/' + accountId + url;
                return this;
            }
        };
        module(function($provide){
            $provide.value('ipCookie', {});
            $provide.value('sessionService', sessionServiceMock);
        });


        inject(function($httpBackend, _alertsService_) {
            service = _alertsService_;
            httpBackend = $httpBackend;
        });
    });

    afterEach(function() {
        httpBackend.verifyNoOutstandingExpectation();
        httpBackend.verifyNoOutstandingRequest();
    });

    describe('get unread alerts', function(){
        it('should get unread alerts if everything is ok', function(){
            // prepare
            httpBackend.expectGET(new RegExp('/accounts/'+accountId+'/alerts?.*$')).respond(alerts);

            // execute
            service.getUnreadAlerts();
            httpBackend.flush();

            // attest
            expect(service.data.unread.length).to.equal(alerts.length);
        });

        it('should get 0 unread alerts if something crashes', function(){
            // prepare
            httpBackend.expectGET(new RegExp('/accounts/'+accountId+'/alerts?.*$')).respond(500);

            // execute
            service.getUnreadAlerts();
            httpBackend.flush();

            // attest
            expect(service.data.unread.length).to.equal(0);
        });
    });

    describe('get alerts', function(){
        it('should call success callback if everything is ok', function(){
            // prepare
            var successCallback = sinon.spy(),
                errorCallback = sinon.spy();

            httpBackend.expectGET(new RegExp('/accounts/'+accountId+'/alerts?.*$')).respond(alerts);

            // execute
            service.getAlerts(successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(true);
            expect(errorCallback.calledOnce).to.equal(false);
            expect(successCallback.args[0].length).to.equal(4);
            expect(successCallback.args[0][0].length).to.equal(alerts.length);
        });

        it('should call error callback if something goes wrong', function(){
            // prepare
            var successCallback = sinon.spy(),
                errorCallback = sinon.spy();

            httpBackend.expectGET(new RegExp('/accounts/'+accountId+'/alerts?.*$')).respond(error.code, error.message);

            // execute
            service.getAlerts(successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(false);
            expect(errorCallback.calledOnce).to.equal(true);
            expect(errorCallback.args[0].length).to.equal(4);
            expect(errorCallback.args[0][1]).to.equal(error.code);
        });
    });

    describe('get alert', function(){
        it('should call success callback if everything is ok', function(){
            // prepare
            var successCallback = sinon.spy(),
                errorCallback = sinon.spy();

            httpBackend.expectGET(new RegExp('/accounts/'+accountId+'/alerts/' + alerts[0].alertId + '?.*$')).respond(alerts[0]);

            // execute
            service.getAlert(alerts[0].alertId, successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(true);
            expect(errorCallback.calledOnce).to.equal(false);
            expect(successCallback.args[0].length).to.equal(4);
            expect(successCallback.args[0][0].alertId).to.equal(alerts[0].alertId);
        });

        it('should call error callback if something goes wrong', function(){
            // prepare
            var successCallback = sinon.spy(),
                errorCallback = sinon.spy();

            httpBackend.expectGET(new RegExp('/accounts/'+accountId+'/alerts/' + alerts[0].alertId + '?.*$')).respond(error.code, error.message);

            // execute
            service.getAlert(alerts[0].alertId, successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(false);
            expect(errorCallback.calledOnce).to.equal(true);
            expect(errorCallback.args[0].length).to.equal(4);
            expect(errorCallback.args[0][1]).to.equal(error.code);
        });
    });

    describe('delete alerts', function(){
        it('should call success callback if everything is ok', function(){
            // prepare
            var successCallback = sinon.spy(),
                errorCallback = sinon.spy(),
                status = 204,
                fakeconfirm = sinon.stub(window,"confirm").returns(true);

            httpBackend.expectDELETE(new RegExp('/accounts/'+accountId+'/alerts?.*$')).respond(status);

            // execute
            service.deleteAlerts(successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(true);
            expect(errorCallback.calledOnce).to.equal(false);
            expect(successCallback.args[0].length).to.equal(4);
            expect(successCallback.args[0][1]).to.equal(status);
            fakeconfirm.restore();
        });

        it('should call error callback if something goes wrong', function(){
            // prepare
            var successCallback = sinon.spy(),
                errorCallback = sinon.spy(),
                fakeconfirm = sinon.stub(window,"confirm").returns(true),
                status = 404;


            httpBackend.expectDELETE(new RegExp('/accounts/'+accountId+'/alerts?.*$')).respond(internalError.code, internalError.message);

            // execute
            service.deleteAlerts(successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(false);
            expect(errorCallback.calledOnce).to.equal(true);
            expect(errorCallback.args[0].length).to.equal(4);
            expect(errorCallback.args[0][1]).to.equal(internalError.code);
            fakeconfirm.restore();
        });
    });

    describe('delete alert', function(){
        it('should call success callback if everything is ok', function(){
            // prepare
            var successCallback = sinon.spy(),
                errorCallback = sinon.spy(),
                alertId = 2,
                status = 204,
                fakeconfirm = sinon.stub(window,"confirm").returns(true);

            httpBackend.expectDELETE(new RegExp('/accounts/'+accountId+'/alerts/' + alertId)).respond(status);

            // execute
            service.deleteAlert(alertId, successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(true);
            expect(errorCallback.calledOnce).to.equal(false);
            expect(successCallback.args[0].length).to.equal(4);
            expect(successCallback.args[0][1]).to.equal(status);
            fakeconfirm.restore();
        });

        it('should call error callback if something goes wrong', function(){
            // prepare
            var successCallback = sinon.spy(),
                errorCallback = sinon.spy(),
                alertId = 2,
                fakeconfirm = sinon.stub(window,"confirm").returns(true),
                status = 404;

            httpBackend.expectDELETE(new RegExp('/accounts/'+accountId+'/alerts/' + alertId)).respond(internalError.code, internalError.message);

            // execute
            service.deleteAlert(alertId, successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(false);
            expect(errorCallback.calledOnce).to.equal(true);
            expect(errorCallback.args[0].length).to.equal(4);
            expect(errorCallback.args[0][1]).to.equal(internalError.code);
            fakeconfirm.restore();
        });
    });

    describe('update status', function(){
        it('should call success callback if everything is ok', function(){
            // prepare
            var ngScopeMock = {
                    $emit: sinon.spy()
                },
                options = {
                    alert: alerts[0],
                    newStatus: 'Open',
                    scope: ngScopeMock
                },
                successCallback = sinon.spy(),
                errorCallback = sinon.spy();

            httpBackend.expectPUT('/accounts/'+accountId+'/alerts/' + alerts[0].alertId + '/status/' + options.newStatus).respond(200);

            // execute
            service.updateStatus(options, successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(true);
            expect(errorCallback.calledOnce).to.equal(false);
            expect(successCallback.args[0].length).to.equal(2);
            expect(successCallback.args[0][1]).to.equal(200);

            expect(ngScopeMock.$emit.calledOnce).to.equal(true);
            expect(ngScopeMock.$emit.args[0].length).to.equal(2);
            expect(ngScopeMock.$emit.args[0][1].alert.alertId).to.equal(alerts[0].alertId);
            expect(ngScopeMock.$emit.args[0][1].newStatus).to.equal(options.newStatus);
        });

        it('should call error callback if something goes wrong', function(){
            // prepare
            var ngScopeMock = {
                    $emit: sinon.spy()
                },
                options = {
                    alert: alerts[0],
                    newStatus: 'Open',
                    scope: ngScopeMock
                },
                successCallback = sinon.spy(),
                errorCallback = sinon.spy();

            httpBackend.expectPUT('/accounts/'+accountId+'/alerts/' + alerts[0].alertId + '/status/' + options.newStatus).respond(500);

            // execute
            service.updateStatus(options, successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(false);
            expect(errorCallback.calledOnce).to.equal(true);
            expect(errorCallback.args[0].length).to.equal(4);
            expect(errorCallback.args[0][1]).to.equal(500);

            expect(ngScopeMock.$emit.calledOnce).to.equal(false);
        });
    });

    describe('reset', function(){
        it('should call success callback if everything is ok', function(){
            // prepare
            var ngScopeMock = {
                    $emit: sinon.spy()
                },
                options = {
                    alert: alerts[0],
                    scope: ngScopeMock
                },
                successCallback = sinon.spy(),
                errorCallback = sinon.spy();

            httpBackend.expectPUT('/accounts/'+accountId+'/alerts/' + alerts[0].alertId + '/reset').respond(200);

            // execute
            service.reset(options, successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(true);
            expect(errorCallback.calledOnce).to.equal(false);
            expect(successCallback.args[0].length).to.equal(2);
            expect(successCallback.args[0][1]).to.equal(200);

            expect(ngScopeMock.$emit.calledOnce).to.equal(true);
            expect(ngScopeMock.$emit.args[0].length).to.equal(2);
            expect(ngScopeMock.$emit.args[0][1].alert.alertId).to.equal(alerts[0].alertId);
            expect(ngScopeMock.$emit.args[0][1].newStatus).to.equal('Closed');
        });

        it('should call error callback if something goes wrong', function(){
            // prepare
            var ngScopeMock = {
                    $emit: sinon.spy()
                },
                options = {
                    alert: alerts[0],
                    scope: ngScopeMock
                },
                successCallback = sinon.spy(),
                errorCallback = sinon.spy();

            httpBackend.expectPUT('/accounts/'+accountId+'/alerts/' + alerts[0].alertId + '/reset').respond(500);

            // execute
            service.reset(options, successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(false);
            expect(errorCallback.calledOnce).to.equal(true);
            expect(errorCallback.args[0].length).to.equal(4);
            expect(errorCallback.args[0][1]).to.equal(500);

            expect(ngScopeMock.$emit.calledOnce).to.equal(false);
        });
    });

    describe('add comments', function(){
        it('should call success callback if everything is ok', function(){
            // prepare
            var options = {
                    alertId: alerts[0].alertId,
                    comments: []
                },
                successCallback = sinon.spy(),
                errorCallback = sinon.spy();

            httpBackend.expectPOST('/accounts/'+accountId+'/alerts/' + alerts[0].alertId + '/comments').respond(200);

            // execute
            service.addComments(options, successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(true);
            expect(errorCallback.calledOnce).to.equal(false);
            expect(successCallback.args[0].length).to.equal(4);
            expect(successCallback.args[0][1]).to.equal(200);
        });

        it('should call error callback if something goes wrong', function(){
            // prepare
            var options = {
                    alertId: alerts[0].alertId,
                    comments: []
                },
                successCallback = sinon.spy(),
                errorCallback = sinon.spy();

            httpBackend.expectPOST('/accounts/'+accountId+'/alerts/' + alerts[0].alertId + '/comments').respond(500);

            // execute
            service.addComments(options, successCallback, errorCallback);
            httpBackend.flush();

            // attest
            expect(successCallback.calledOnce).to.equal(false);
            expect(errorCallback.calledOnce).to.equal(true);
            expect(errorCallback.args[0].length).to.equal(4);
            expect(errorCallback.args[0][1]).to.equal(500);
        });
    });
});
