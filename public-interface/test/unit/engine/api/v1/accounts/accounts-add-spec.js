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
    accountManager = rewire('../../../../../../engine/api/v1/accounts'),
    errBuilder = require('../../../../../../lib/errorHandler/index').errBuilder,
    uuid = require('uuid'),
    Q = require('q');

describe('accountsApi.addAccountWithGlobalCode', function () {
    var data = {},
        userId = uuid.v4(),
        acc = {
            public_id: uuid.v4(),
            name: "test"
        },
        domain = {
            public_id: acc.public_id
        },
        user = {},
        errorCode = "0x0",
        defaultError = {code: errorCode},

        accountMock,

        userProxyMock,
        postgresProviderMock,
        callback;

    beforeEach(function () {
        user = {
            id: uuid.v4()
        };

        accountMock = {
            delete: sinon.stub().returns(Q.resolve({})),
            new: sinon.stub().returns(Q.resolve({})),
            find: sinon.stub().withArgs(acc.public_id).callsArgWith(1, null, domain)

        };

        userProxyMock = {
            addOrUpdateUser: sinon.stub().withArgs(user).callsArgWith(1, null)
        };
        postgresProviderMock = {
            startTransaction: sinon.stub().returns(Q.resolve()),
            rollback: sinon.stub(),
            commit: sinon.stub()
        };

        accountManager.__set__('postgresProvider', postgresProviderMock);
        callback = sinon.spy();
    });

    it('should set default data values', function (done) {
        //execute
        accountManager.addAccountWithGlobalCode(data, userId, callback);

        //attest
        expect(data.exec_interval).to.be.equal(300);
        expect(data.base_line_exec_interval).to.be.equal(86400);
        expect(data.cd_model_frequency).to.be.equal(604800);
        expect(data.cd_execution_frequency).to.be.equal(600);
        expect(data.data_retention).to.be.equal(0);
        done();
    });

    it('should callback error when account.new failed', function (done) {
        //prepare
        defaultError = errBuilder.build(errBuilder.Errors.Account.SavingError);
        accountMock.new = sinon.stub().returns(Q.reject());

        //execute && attest
        accountManager.addAccountWithGlobalCode(data, userId, callback)
            .then(function(){
                expect(callback.calledOnce).to.be.equal(true);
                expect(JSON.stringify(callback.getCall(0).args[0])).to.equal(JSON.stringify(defaultError));
                expect(callback.args[0][0].code).to.be.equal(defaultError.code);
                done();
            }).catch(function(err){
                done(err);
            });
    });

    it('should create new group when account.new succeded', function (done) {
        //prepare
        var callback = sinon.spy();

        //execute && attest
        accountManager.addAccountWithGlobalCode(data, userId, callback)
            .then(function(){
                expect(callback.calledOnce).to.be.equal(true);
                done();
            }).catch(function(err){
                done(err);
            });

    });

    it('should updateUserAtAccount when generateGlobalActivationCode succeded', function (done) {
        //execute && attest
        accountManager.addAccountWithGlobalCode(data, userId, callback)
            .then(function(){

                expect(callback.calledOnce).to.be.equal(true);
                done();
            }).catch(function(err){
                done(err);
            });
    });


});
