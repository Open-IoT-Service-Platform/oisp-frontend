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

describe('accountsApi.delete', function () {

    var postgresProviderMock,
        error,
        deletedAccountsCount,
        accountId,
        errorAAaccountID,
        account,
        accountMock,
        postgresProviderMock,

        error,
        callback;

    beforeEach(function () {
        postgresProviderMock = {
            startTransaction: sinon.stub().returns(Q.resolve()),
            rollback: sinon.stub(),
            commit: sinon.stub()
        };
        deletedAccountsCount = 5;
        accountId = uuid.v4();
        errorAAaccountID = uuid.v4();
        account = {public_id: accountId, id: accountId, activation_code: "xvLugHxL", activation_code_expire_date: Date.now() * 2},

        accountMock = {
            delete: sinon.stub().returns(Q.resolve(deletedAccountsCount))
        };

        callback = sinon.spy();
        accountManager.__set__('account', accountMock);

        accountManager.__set__('postgresProvider', postgresProviderMock);
    });

    it('should delete a account', function (done) {
        // execute
        accountManager.delete(accountId, callback)
            .then(function(){
                expect(callback.calledOnce).to.equal(true);
                expect(callback.calledWith(null)).to.equal(true);
                expect(accountMock.delete.calledOnce).to.equal(true);
                done();
            }).catch(function(err){
                done(err);
            });

    });

    it('should fail finding the account for deletion if acc not exists', function (done) {
        // prepare
        error = errBuilder.build(errBuilder.Errors.Account.NotFound);

        accountMock.delete = sinon.stub().returns(Q.reject(error));
        // execute && attest
        accountManager.delete(accountId, callback)
            .then(function(){
                expect(callback.calledOnce).to.equal(true);
                expect(JSON.stringify(callback.getCall(0).args[0])).to.equal(JSON.stringify(error));
                expect(callback.args[0].length).to.equal(1);
                expect(callback.args[0][0].code).to.equal(3404);
                done();
            }).catch(function(err){
                done(err);
            });
    });

});
