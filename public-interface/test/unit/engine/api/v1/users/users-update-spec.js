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

describe('usersApi.updateUser', function () {
    var usersManager,
        user,
        accId,
        userMock,
        postgresProviderMock,
        callback,
        rollbackDone;

    beforeEach(function () {
        usersManager = rewire('../../../../../../engine/api/v1/users');
        Q.longStackSupport = true;

        user = { email: 'test@user', password: uuid.v4()};
        accId = uuid.v4();

        userMock = {
            update: sinon.stub().returns(Q.resolve(user))
        };
        rollbackDone = sinon.stub().returns(Q.resolve());
        postgresProviderMock = {
            startTransaction: sinon.stub().returns(Q.resolve()),
            rollback: sinon.stub().returns({
                done: rollbackDone
            }),
            commit: sinon.stub().returns(Q.resolve())
        };
        callback = sinon.spy();

        usersManager.__set__('user', userMock);
        usersManager.__set__('postgresProvider', postgresProviderMock);
    });

    it('should update an existing user', function (done) {
        // execute
        usersManager.updateUser(user, null)
            .done(function() {
                // attest
                expect(postgresProviderMock.startTransaction.calledOnce).to.be(true);
                expect(userMock.update.calledOnce).to.equal(true);
                expect(postgresProviderMock.commit.calledOnce).to.be(true);

                done();
            });
    });

    it('should update an existing user with accounts for admin role', function (done) {
        // prepare
        user.accounts = {};
        user.accounts[accId] = {
                        role: "admin"
                    };
        // execute
        usersManager.updateUser(user, accId)
            .done(function() {
                // attest
                expect(postgresProviderMock.startTransaction.calledOnce).to.be(true);
                expect(userMock.update.calledOnce).to.equal(true);
                expect(postgresProviderMock.commit.calledOnce).to.be(true);

                done();
            });
    });

    it('should update an existing user with accounts for user role', function (done) {
        // prepare
        user.accounts = {};
        user.accounts[accId] = {
            role: "user"
        };

        // execute
        usersManager.updateUser(user, accId)
            .done(function() {
                // attest
                expect(postgresProviderMock.startTransaction.calledOnce).to.be(true);
                expect(userMock.update.calledOnce).to.equal(true);
                expect(postgresProviderMock.commit.calledOnce).to.be(true);

                done();
            });
    });

    it('should update an existing user with accounts for user without specified role', function (done) {
        // prepare
        var error = errBuilder.build(errBuilder.Errors.User.CannotReduceAdminPrivileges);
        user.accounts = {};
        user.accounts[accId] = {
            role: "user"
        };

        userMock.update = sinon.stub().returns(Q.reject(errBuilder.Errors.User.CannotReduceAdminPrivileges));

        // execute
        usersManager.updateUser(user, accId)
            .catch(function(err) {
                expect(err.code).to.be.equal(error.code);
            })
            .done(function() {
                // attest
                done();
            });
    });

    it('should not update if user update failed in DB', function (done) {
        // prepare
        var error = errBuilder.build(errBuilder.Errors.User.SavingError);
        userMock.update = sinon.stub().returns(Q.reject());

        // execute
        usersManager.updateUser(user, accId)
            .catch(function(err) {
                expect(err.code).to.be.equal(error.code);
            })
            .done(function() {
                // attest
                expect(postgresProviderMock.startTransaction.calledOnce).to.be(true);
                expect(userMock.update.calledOnce).to.equal(true);
                expect(postgresProviderMock.rollback.calledOnce).to.be(true);

                done();
            });
    });
});
