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
    uuid = require('uuid');

describe('accountsApi.getAccount', function () {

    var accountId, account, accountMock, callback;

    beforeEach(function () {
        accountId = uuid.v4();
        account = {public_id: accountId, id: accountId, activation_code: "xvLugHxL", activation_code_expire_date: Date.now() * 2};
        account.id = account.public_id;
        account.pid = accountId;
        callback = sinon.spy();
        accountMock = {
            find: sinon.stub().withArgs(account.pid).callsArgWith(1, null, account)
        };
        accountManager.__set__('account', accountMock);
    });

    it('should retrieve account', function (done) {
        // execute
        accountManager.getAccount(account.pid, callback);

        // attest
        expect(callback.calledWith(null, account)).to.equal(true);

        done();
    });

    it('should fail when account not found', function (done) {
        // prepare
        accountMock.find = sinon.stub().callsArgWith(1, {});

        // execute
        accountManager.getAccount(account.pid, callback);

        // attest
        expect(callback.args[0].length).to.equal(1);
        expect(callback.args[0][0].code).to.equal(3404);

        done();
    });
});
