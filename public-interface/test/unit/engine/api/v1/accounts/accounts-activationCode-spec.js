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
    accountId = uuid.v4(),
    account = {public_id: accountId, id: accountId, activation_code: "xvLugHxL", activation_code_expire_date: Date.now() * 2};

describe('accountsApi.getActivationCode', function () {
    var accountMock,
        callback;

    beforeEach(function () {
        callback = sinon.spy();

        accountMock = {
            find: sinon.stub().withArgs(accountId).callsArgWith(1, null, account)
        };
        accountManager.__set__('account', accountMock);
    });

    it('should return activation code if account found and code is active', function (done) {
        //execute
        accountManager.getActivationCode(accountId, callback);

        //attest
        expect(callback.calledOnce).to.be.equal(true);
        expect(callback.args[0][0]).to.be.equal(null);
        expect(callback.args[0][1]['expire']).to.be.equal(account.activation_code_expire_date);
        expect(callback.args[0][1]['id']).to.be.equal(account.activation_code);
        done();
    });

    it('should return empty data if account found and code expired', function (done) {
        //prepare
        account.activation_code_expire_date = Date.now() / 2;

        //execute
        accountManager.getActivationCode(accountId, callback);

        //attest
        expect(callback.calledOnce).to.be.equal(true);
        expect(callback.args[0][0]).to.be.equal(null);
        expect(callback.args[0][1]).to.be.equal(null);
        done();
    });

    it('should callback Device.ActivationError error when Account.find failed', function (done) {
        //prepare
        accountMock.find.withArgs(accountId).callsArgWith(1, true);

        //execute
        accountManager.getActivationCode(accountId, callback);

        //attest
        expect(callback.calledOnce).to.be.equal(true);
        expect(callback.args[0][0].code).to.be.equal(errBuilder.Errors.Device.ActivationError.code);
        done();
    });
});

describe('accountsApi.regenerateActivationCode', function () {
    var accountId = uuid.v4(),
        accountMock,
        callback;

    beforeEach(function () {
        callback = sinon.spy();

        accountMock = {
            refreshActivationCode: sinon.stub().withArgs(accountId).callsArgWith(1, null, account)
        };
        accountManager.__set__('account', accountMock);
    });

    it('should return new activation code if account found and code is active', function (done) {
        //execute
        accountManager.regenerateActivationCode(accountId, callback);

        //attest
        expect(callback.calledOnce).to.be.equal(true);
        expect(callback.args[0][0]).to.be.equal(null);
        expect(callback.args[0][1]['expire']).to.be.equal(account.activation_code_expire_date);
        expect(callback.args[0][1]['id']).to.be.equal(account.activation_code);
        done();
    });

    it('should return Account Saving Error if error occured', function (done) {
        //prepare
        accountMock.refreshActivationCode.withArgs(accountId).callsArgWith(1, true);
        //execute
        accountManager.regenerateActivationCode(accountId, callback);

        //clean
        account.activation_code_expire_date = Date.now() * 2;
        //attest
        expect(callback.calledOnce).to.be.equal(true);
        expect(callback.args[0][0].code).to.be.equal(errBuilder.Errors.Account.SavingError.code);
        done();
    });

    it('should return Account Saving Error if account not found', function (done) {
        //prepare
        accountMock.refreshActivationCode.withArgs(accountId).callsArgWith(1, null, null);

        //execute
        accountManager.regenerateActivationCode(accountId, callback);

        //attest
        expect(callback.calledOnce).to.be.equal(true);
        expect(callback.args[0][0].code).to.be.equal(errBuilder.Errors.Account.SavingError.code);
        done();
    });
});
