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
    accountHandler = rewire('../../../../../engine/handlers/v1/accounts'),
    httpStatuses = require('../../../../../engine/res/httpStatuses'),
    errBuilder  = require("../../../../../lib/errorHandler/errorHandler").errBuilder,
    uuid = require('uuid');

describe('accounts handler', function() {
    var reqMock, resMock, nextMock, attributesValidationMock, errorCode, responseCode, errorObj, error;
    beforeEach(function(){
        responseCode = null;
        errorObj = null;
        error = null;
        reqMock = {
            body: {},
            identity: uuid.v4(),
            params: {
                accountId: uuid.v4()
            }
        };
        resMock = {
            setHeader: sinon.spy(),
            send: sinon.spy(),
            status: function(code) {
                responseCode = code;
                return this;
            }
        };
        nextMock = sinon.spy();
        attributesValidationMock = {
            checkLimitsForAttributes: sinon.stub()
        };
        errorCode = errBuilder.Errors.Generic.InternalServerError.code;
    });

    describe('usage', function () {

        it('usage', function (done) {
            // execute
            accountHandler.usage(reqMock, resMock, nextMock);

            // attest
            expect(resMock.setHeader.calledOnce).to.equal(true);
            expect(resMock.send.calledOnce).to.equal(true);
            expect((httpStatuses.OK.code)).to.equal(responseCode);

            done();
        });
    });
    describe('add account', function () {

        it('should not add account if request body is invalid', function (done) {
            // execute
        	error = errBuilder.build(errBuilder.Errors.Account.InvalidData);
        	errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
            accountHandler.addAccount(reqMock, resMock, nextMock);

            // attest
            expect(nextMock.calledOnce).to.equal(true);
            expect(nextMock.calledWith(sinon.match(errorObj))).to.equal(true);

            done();
        });
        it('should add account if request body is valid', function (done) {
            // prepare
            var account = {
                    public_id: uuid.v4()
                },
                accountRes = {
                    id: account.public_id
                },
                accountApiMock = {
                    addAccountWithGlobalCode: sinon.stub().callsArgWith(2, null, account)
                };
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, null);
            reqMock.body = {
                name: 'name'
            };
            accountHandler.__set__('account', accountApiMock);
            accountHandler.__set__('attributesValidation', attributesValidationMock);
            // execute
            accountHandler.addAccount(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.called).to.equal(true);
            expect(resMock.send.calledOnce).to.equal(true);
            expect(resMock.send.calledWith(accountRes)).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.Created.code);

            done();
        });
        it('should not add account if request body is valid but error is encountered', function (done) {
            // prepare
            var error = new Error(errorCode),
                accountApiMock = {
                    addAccountWithGlobalCode: sinon.stub().callsArgWith(2, error, null)
                };
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, null);
            reqMock.body = {
                name: 'name'
            };
            accountHandler.__set__('account', accountApiMock);
            accountHandler.__set__('attributesValidation', attributesValidationMock);
            // execute
            accountHandler.addAccount(reqMock, {}, nextMock);

            // attest
            expect(nextMock.called).to.equal(true);
            expect(nextMock.calledOnce).to.equal(true);
            expect(nextMock.calledWith(error)).to.equal(true);

            done();
        });
        it('should not add account with attributes if they did not pass validation', function (done) {
            // prepare
            var attributesValidationErrors = [ 'Error'];
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, attributesValidationErrors);
            reqMock.body = {
                name: 'name'
            };
            accountHandler.__set__('attributesValidation', attributesValidationMock);

            // execute
            accountHandler.addAccount(reqMock, {}, nextMock);

            // attest
            expect(nextMock.calledOnce).to.equal(true);
            expect(nextMock.args[0][0].code).to.equal(httpStatuses.BadRequest.code);
            expect(nextMock.args[0][0].errors).to.equal(attributesValidationErrors);

            done();
        });
    });
    describe('regenerate activation code', function () {

        it('should get regenerated activation code if request data is valid', function (done) {
            //prepare
            var code = {
                    id: 1,
                    expiresAt: new Date((new Date()).getTime())
                },
                accountApiMock = {
                    regenerateActivationCode: sinon.stub().callsArgWith(1, null, code)
                };

            accountHandler.__set__('account', accountApiMock);

            // execute
            accountHandler.regenerateActivationCode(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.called).to.equal(true);
            expect((httpStatuses.OK.code)).to.equal(responseCode);

            done();
        });
        it('should not get regenerated activation code if request data is invalid', function (done) {
            //prepare
            var error = new Error(errBuilder.Errors.Account.NotFound),
                accountApiMock = {
                    regenerateActivationCode: sinon.stub().callsArgWith(1, error, null)
                };

            accountHandler.__set__('account', accountApiMock);

            // execute
            accountHandler.regenerateActivationCode(reqMock, {}, nextMock);

            // attest
            expect(nextMock.called).to.equal(true);
            expect(nextMock.calledWith(error)).to.equal(true);

            done();
        });
        it('should get object with nulls if request data is null', function (done) {
            //prepare
            var responseBody = {
                    activationCode: null,
                    timeLeft: null
                },
                accountApiMock = {
                    regenerateActivationCode: sinon.stub().callsArgWith(1, null, null)
                };

            accountHandler.__set__('account', accountApiMock);

            // execute
            accountHandler.regenerateActivationCode(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.called).to.equal(true);
            expect(resMock.send.calledWith(responseBody)).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);

            done();
        });
    });
    describe('get global activation code', function () {

        it('should get activation code if request data is valid', function (done) {
            //prepare
            var code = {
                    id: 1,
                    expire: new Date((new Date()).getTime())
                },
                responseCodeBody = {
                    activationCode: code.id,
                    timeLeft: Math.round(code.expire / 1000)
                },
                accountApiMock = {
                    getActivationCode: sinon.stub().callsArgWith(1, null, code)
                };


            accountHandler.__set__('account', accountApiMock);
            //accountHandler.__set__('convertToActCodeObj', converter)

            // execute
            accountHandler.getGlobalActivationCode(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.called).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(resMock.send.calledWith(responseCodeBody)).to.equal(true);

            done();
        });
        it('should not get activation code if request data is invalid', function (done) {
            //prepare
            var error = new Error(errBuilder.Errors.Device.ActivationError),
                accountApiMock = {
                    getActivationCode: sinon.stub().callsArgWith(1, error, null)
                };

            accountHandler.__set__('account', accountApiMock);

            // execute
            accountHandler.getGlobalActivationCode(reqMock, {}, nextMock);

            // attest
            expect(nextMock.called).to.equal(true);
            expect(nextMock.calledWith(error)).to.equal(true);

            done();
        });
        it('should get object with nulls if request data is null', function (done) {
            //prepare
            var responseBody = {
                    activationCode: null,
                    timeLeft: null
                },
                accountApiMock = {
                    getActivationCode: sinon.stub().callsArgWith(1, null, null)
                };

            accountHandler.__set__('account', accountApiMock);

            // execute
            accountHandler.getGlobalActivationCode(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.called).to.equal(true);
            expect(resMock.send.calledWith(responseBody)).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);

            done();
        });
    });
    describe('get account', function () {

        it('should get account if request data is valid', function (done) {
            //prepare
            var acc = {
                    public_id: reqMock.params.accountId
                },
                responseAcc = {
                    id: acc.public_id
                },
                accountApiMock = {
                    getAccount: sinon.stub().callsArgWith(1, null, acc)
                };

            accountHandler.__set__('account', accountApiMock);

            // execute
            accountHandler.getAccount(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.called).to.equal(true);
            expect(resMock.send.calledWith(responseAcc)).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);

            done();
        });
        it('should not get account if something crashes', function (done) {
            //prepare
            var error = new Error(errBuilder.Errors.Account.NotFound),
                accountApiMock = {
                    getAccount: sinon.stub().callsArgWith(1, error, null)
                };

            accountHandler.__set__('account', accountApiMock);

            // execute
            accountHandler.getAccount(reqMock, {}, nextMock);

            // attest
            expect(nextMock.called).to.equal(true);
            expect(nextMock.calledWith(error)).to.equal(true);

            done();
        });
        it('should not get account if param accountId is missing', function (done) {
            //prepare
            var error = errBuilder.Errors.Generic.InvalidRequest.code;
            reqMock.params = {};

            // execute
            accountHandler.getAccount(reqMock, {}, nextMock);

            // attest
            expect(nextMock.called).to.equal(true);
            expect(nextMock.calledOnce).to.equal(true);
            expect(nextMock.getCall(0).args[0].code).to.equal(error);

            done();
        });
    });
    describe('update account', function () {
        var acc;
        beforeEach(function(){
            acc = {
                public_id: reqMock.params.accountId
            };
            reqMock.body = {
                name: 'name',
                id: uuid.v4(),
                created: Date.now()
            };
        });

        it('should update account if request data is valid', function (done) {
            //prepare
            var accountApiMock = {
                    updateAccount: sinon.stub().callsArgWith(1, null, acc)
                };
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, null);

            accountHandler.__set__('account', accountApiMock);
            accountHandler.__set__('attributesValidation', attributesValidationMock);

            // execute
            accountHandler.updateAccount(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.called).to.equal(true);
            expect((httpStatuses.OK.code)).to.equal(responseCode);

            done();
        });
        it('should not update account attributes if they did not pass validation', function (done) {
            //prepare
            var attributesValidationErrors = [ 'Error'];
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, attributesValidationErrors);

            accountHandler.__set__('attributesValidation', attributesValidationMock);

            // execute
            accountHandler.updateAccount(reqMock, resMock, nextMock);

            // attest
            expect(nextMock.calledOnce).to.equal(true);
            expect(nextMock.args[0][0].code).to.equal(httpStatuses.BadRequest.code);
            expect(nextMock.args[0][0].errors).to.equal(attributesValidationErrors);

            done();
        });
        it('should not update account if something crashes', function (done) {
            //prepare
            var error = new Error(errorCode),
                accountApiMock = {
                    updateAccount: sinon.stub().callsArgWith(1, error, null)
                };
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, null);

            accountHandler.__set__('account', accountApiMock);
            accountHandler.__set__('attributesValidation', attributesValidationMock);

            // execute
            accountHandler.updateAccount(reqMock, resMock, nextMock);

            // attest
            expect(nextMock.called).to.equal(true);
            expect(nextMock.calledWith(error)).to.equal(true);

            done();
        });
        it('should update account also without id key in data request', function (done) {
            //prepare
            var accountApiMock = {
                    updateAccount: sinon.stub().callsArgWith(1, null, acc)
                };
            delete reqMock.body.id;
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, null);

            accountHandler.__set__('account', accountApiMock);
            accountHandler.__set__('attributesValidation', attributesValidationMock);

            // execute
            accountHandler.updateAccount(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.called).to.equal(true);
            expect(resMock.send.calledWith(acc)).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);

            done();
        });
        it('should not update account if request body is incorrect', function (done) {
            //prepare
            reqMock.body = {};

            // execute
            accountHandler.updateAccount(reqMock, resMock, nextMock);

            // attest
            expect(nextMock.called).to.equal(true);
            expect(nextMock.calledOnce).to.equal(true);

            done();
        });
    });
    describe('update attributes', function () {

        it('should update attributes if request data is valid', function (done) {
            //prepare
            var accountApiMock = {
                    updateAttributes: sinon.stub().callsArgWith(1, null)
                };
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, null);
            reqMock.body = {
                attributes: 'attrs'
            };

            accountHandler.__set__('account', accountApiMock);
            accountHandler.__set__('attributesValidation', attributesValidationMock);

            // execute
            accountHandler.updateAttributes(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.calledOnce).to.equal(true);
            expect((httpStatuses.OK.code)).to.equal(responseCode);

            done();
        });
        it('should not update account attributes if they did not pass validation', function (done) {
            //prepare
            var attributesValidationErrors = [ 'Error'];
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, attributesValidationErrors);
            reqMock.body = {
                attributes: 'attrs'
            };

            accountHandler.__set__('attributesValidation', attributesValidationMock);

            // execute
            accountHandler.updateAttributes(reqMock, resMock, nextMock);

            // attest
            expect(nextMock.calledOnce).to.equal(true);
            expect(nextMock.args[0][0].code).to.equal(httpStatuses.BadRequest.code);
            expect(nextMock.args[0][0].errors).to.equal(attributesValidationErrors);

            done();
        });
        it('should not update account if something crashes', function (done) {
            //prepare
            var error = new Error(errorCode),
                accountApiMock = {
                    updateAttributes: sinon.stub().callsArgWith(1, error)
                };
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, null);
            reqMock.body = {
                attributes: 'attrs'
            };

            accountHandler.__set__('account', accountApiMock);
            accountHandler.__set__('attributesValidation', attributesValidationMock);

            // execute
            accountHandler.updateAttributes(reqMock, resMock, nextMock);

            // attest
            expect(nextMock.called).to.equal(true);
            expect(nextMock.calledWith(error)).to.equal(true);

            done();
        });
        it('should not update account if request body is incorrect', function (done) {
            //prepare
            reqMock.body = {};

            // execute
            accountHandler.updateAttributes(reqMock, resMock, nextMock);

            // attest
            expect(nextMock.called).to.equal(true);
            expect(nextMock.calledOnce).to.equal(true);

            done();
        });
    });
    describe('delete account', function () {

        it('should delete account if account exists', function (done) {
            //prepare
            var accountApiMock = {
                delete: sinon.stub().callsArgWith(1, null)
            };
            accountHandler.__set__('account', accountApiMock);

            // execute
            accountHandler.deleteAccount(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.calledOnce).to.equal(true);
            expect((httpStatuses.DeleteOK.code)).to.equal(responseCode);

            done();
        });
        it('should not delete account if something crashes', function (done) {
            //prepare
            var error = new Error(errorCode),
                accountApiMock = {
                    delete: sinon.stub().callsArgWith(1, error)
                };
            accountHandler.__set__('account', accountApiMock);

            // execute
            accountHandler.deleteAccount(reqMock, resMock, nextMock);

            // attest
            expect(nextMock.calledOnce).to.equal(true);
            expect(nextMock.calledWith(error)).to.equal(true);

            done();
        });
    });
});
