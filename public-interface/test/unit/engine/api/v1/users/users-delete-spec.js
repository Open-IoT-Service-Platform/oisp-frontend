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
    uuid = require('uuid'),
    Q = require('q'),
    errBuilder = require('../../../../../../lib/errorHandler/index').errBuilder;

describe('usersApi.deleteUserFromAccount', function() {
    var usersManager;

    var userMock,
        userSettingsMock,
        postgresProviderMock,
        user,
        email,
        accountId,
        callback,
        isSelf;

    beforeEach(function() {
        usersManager = rewire('../../../../../../engine/api/v1/users');
        Q.longStackSupport = true;
        // fixtures
        user = {accounts:{}};
        email = "test-"+uuid.v4()+"@example.com";
        accountId = uuid.v4();
        callback = sinon.spy();
        isSelf = true;
        user.accounts[accountId] = {role: "user"};

        // tools
        userMock = {
            findByEmail: sinon.stub().yields(null, user),
            removeAccount: sinon.stub().returns(Q.resolve({_id: Math.random()}))
        };

        userSettingsMock = {
            deleteAccounts: sinon.stub().returns(Q.resolve())
        };
        postgresProviderMock = {
            startTransaction: sinon.stub().returns(Q.resolve()),
            rollback: sinon.stub(),
            commit: sinon.stub()
        };

        // settings
        usersManager.__set__('postgresProvider', postgresProviderMock);
        usersManager.__set__('user', userMock);
        usersManager.__set__('userSettings', userSettingsMock);

    });

    it('should remove user from account in db if caller is not user to update, and updated user is user for account', function(done) {
        // prepare
        var userId = uuid.v4();
        userMock.removeAccount = sinon.stub().returns(Q.resolve({_id: userId}));

        // execute
        usersManager.deleteUserFromAccount(email, accountId, !isSelf, callback)
            .done(function() {
                // attest
                expect(userSettingsMock.deleteAccounts.calledOnce).to.be(true);

                done();
            });
    });

    it('should not remove user from account if caller is not user to update, and updated user is an admin for account', function(done) {
        // prepare
        user.accounts[accountId] = 'admin';

        // execute
        usersManager.deleteUserFromAccount(email, accountId, !isSelf, callback)
            .catch(function(err) {
                expect(err.code).to.equal(401);
            })
            .done(function() {
                // attest
                expect(userSettingsMock.deleteAccounts.notCalled).to.be(true);
                done();
            });
    });


    it('should remove user from account in db', function(done) {
        // prepare
        var userId = uuid.v4();
        user.id = userId;
        userMock.removeAccount = sinon.stub().returns(Q.resolve({_id: userId}));

        // execute
        usersManager.deleteUserFromAccount(email, accountId, isSelf, callback)
            .done(function() {
                // attest
                expect(userSettingsMock.deleteAccounts.calledOnce).to.be(true);
                expect(userSettingsMock.deleteAccounts.getCall(0).args.slice(0,2)).to.eql([userId, accountId]);

                done();
            });
    });
});

describe('usersApi.deleteUser', function () {
    var userMock = {
            delete: sinon.stub().yields(null),
            findByIdWithAccountDetails: sinon.stub().yields(null, {})
        },

        userSettingsMock = {
            deleteAllByUser: sinon.stub().yields(null)
        },
        userStub = {
            id: uuid.v4(),
            email: 'test@example.com'
        },
        postgresProviderMock, rollbackDone;

    var usersManager;

    beforeEach(function () {
        rollbackDone = sinon.stub().returns(Q.resolve());
        postgresProviderMock = {
            startTransaction: sinon.stub().returns(Q.resolve()),
            rollback: sinon.stub().returns({
                done: rollbackDone
            }),
            commit: sinon.stub().returns(Q.resolve()),
        };

        usersManager = rewire('../../../../../../engine/api/v1/users');
        usersManager.__set__('user', userMock);

        usersManager.__set__('userSettings', userSettingsMock);
        usersManager.__set__('postgresProvider', postgresProviderMock);
    });

    it('should delete a user if exists', function (done) {

        var userDeleteResolve = sinon.spy();
        var userDeleteReject = sinon.spy();

        usersManager.deleteUser(userStub)
            .then(function () {
                userDeleteResolve();
            }, function() {
                userDeleteReject();
            })
            .finally(function () {
                expect(userDeleteResolve.calledOnce).to.be.equal(true);
                expect(userDeleteReject.notCalled).to.be.equal(true);
                done();
            });
    });

    it('should call callback with 2404 error code if user does not exist', function (done) {
        var error = new Error(404),
            userMock = {
                delete: sinon.stub().callsArgWith(1, error)
            };

        usersManager.__set__('user', userMock);

        usersManager.deleteUser()
            .then(function () {
                expect(rollbackDone.calledOnce).to.be(true);
                done();
            });
    });

    it('should succeed even with 2404 error code if user does not exist in AA', function (done) {
        var error = new Error(404);

        var userDeleteResolve = sinon.spy();
        var userDeleteReject = sinon.spy();
        var userDeleteError = null;

        usersManager.deleteUser()
            .then(function () {
                userDeleteResolve();
            }, function(err) {
                userDeleteReject();
                userDeleteError = err;
            })
            .finally(function () {
                expect(userDeleteResolve.calledOnce).to.be.equal(true);
                expect(userDeleteReject.notCalled).to.be.equal(true);
                expect(userDeleteError).to.be.equal(null);
                done();
            });
    });


});
