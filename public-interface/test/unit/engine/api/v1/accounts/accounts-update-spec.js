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
    errBuilder = require('../../../../../../lib/errorHandler/index').errBuilder,
    uuid = require('uuid'),
    accountManager = rewire('../../../../../../engine/api/v1/accounts'),
    Q = require('q');

describe('accountsApi.updateAccount', function () {
    var accountId, account, accountFound, accountMock, postgresProviderMock, callback;

    beforeEach(function () {
        accountId = uuid.v4();
        account = {
            pid: accountId,
            as: {
                a: 'b',
                c: 'd'
            },
            id: accountId
        };
        accountFound = {
            pid: account.accountId,
            as: account.as,
            id: account.accountId,
            newProperty: 10
        };

        postgresProviderMock = {
            startTransaction: sinon.stub().returns(Q.resolve()),
            rollback: sinon.stub(),
            commit: sinon.stub()
        };

        accountMock = {
            update: sinon.stub().returns(Q.resolve(accountFound)),
            find: sinon.stub().withArgs(account.id).callsArgWith(1, null, accountFound)
        };
        callback = sinon.spy();

        accountManager.__set__('account', accountMock);
        accountManager.__set__('postgresProvider', postgresProviderMock);
    });

    it('should replace account', function (done) {
        // execute && attest
        accountManager.updateAccount(account, callback)
            .then(function(){
                expect(callback.calledWith(null, accountFound)).to.equal(true);
                expect(accountFound.newProperty).not.to.equal(undefined);
                done();
            }).catch(function(err){
                done(err);
            });
    });

    it('should callback Account.SavingError if local db returns error', function (done) {
        // prepare
        accountMock.update = sinon.stub().returns(Q.reject());

        // execute && attest
        accountManager.updateAccount(account, callback)
            .then(function(){
                expect(callback.args[0].length).to.equal(1);
                expect(callback.args[0][0].code).to.equal(errBuilder.Errors.Account.SavingError.code);
                done();
            }).catch(function(err){
                done(err);
            });
    });

    describe('accountsApi.updateAttributes', function () {
        var data = {
            public_id: uuid.v4(),
            attributes: {
                "attributeOne": 'ValueOne'
            }
        };


        it('should call update account when Account.find succeded', function (done) {
            //execute
            accountManager.updateAttributes(data, callback);

            //attest
            //attest
            setTimeout(function(){
                expect(callback.calledOnce).to.be.equal(true);
                expect(callback.args[0][0]).to.be.equal(null);
                done();
            }, 2);

        });
    });
});
