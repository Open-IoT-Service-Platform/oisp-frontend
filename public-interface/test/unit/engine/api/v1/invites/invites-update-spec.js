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
    errBuilder  = require("../../../../../../lib/errorHandler/index").errBuilder,
    Q = require('q'),
    invitesApi = rewire('../../../../../../engine/api/v1/invites'),
    uuid = require('uuid');

describe('invitesApi.updateInviteStatus', function () {

    var inviteEntityMock,
        userEntityMock,
        postgresProviderMock;

    var inviteStub,
        userStub;

    var inviteId = 1,
        callback,
        error;

    function assertPostgressTransactionSucceded(){
        assertTransactionRollbackIs(false);
    }

    function assertPostgressTransactionFailed(){
        assertTransactionRollbackIs(true);
    }

    function assertTransactionRollbackIs(rollbackExpected){
        rollbackExpected = rollbackExpected || false;
        var commitExpected = !rollbackExpected;
        expect(postgresProviderMock.startTransaction.calledOnce).to.be(true);
        expect(postgresProviderMock.rollback.calledOnce).to.be(rollbackExpected);
        expect(postgresProviderMock.commit.calledOnce).to.be(commitExpected);
    }

    function prepareStub() {
        inviteStub = {
            inviteId: inviteId,
            domainId: uuid.v4(),
            email: "user_email"
        };
        userStub = {
            id: uuid.v4(),
            email: inviteStub.email,
            accounts: []
        };
        error = "error";
    };

    function prepareMocks() {
        inviteEntityMock = {
            findById: sinon.stub().returns(Q.resolve(inviteStub)),
            delete: sinon.stub().returns(Q.resolve())
        };
        userEntityMock = {
            findById: sinon.stub().returns(Q.resolve(userStub)),
            updateByEmail: sinon.stub().returns(Q.resolve(userStub))
        };

        postgresProviderMock = {
            commit: sinon.stub().returns(Q.resolve()),
            startTransaction: sinon.stub().returns(Q.resolve()),
            rollback: sinon.stub().returns({
                done: sinon.stub().returns(Q.resolve()),
                finally: sinon.stub().returns(Q.resolve())
            })
        };

        callback = sinon.spy();

        invitesApi.__set__('postgresProvider', postgresProviderMock);
        invitesApi.__set__('invites', inviteEntityMock);
        invitesApi.__set__('users', userEntityMock);

    };

    beforeEach(function () {
        callback = sinon.spy();
        prepareStub();
        prepareMocks();
    });

    it('should return success if invite was deleted', function (done) {

        invitesApi.updateInviteStatus(inviteId, false, userStub.id, callback)
            .then(function(){
                assertPostgressTransactionSucceded();
                expect(inviteEntityMock.delete.calledOnce).to.be.equal(true);
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('should return success if user and invite was updated', function (done) {

        invitesApi.updateInviteStatus(inviteId, true, userStub.id, callback)
            .then(function(){
                assertPostgressTransactionSucceded();
                expect(inviteEntityMock.delete.calledOnce).to.be.equal(true);
                expect(userEntityMock.updateByEmail.calledOnce).to.be.equal(true);
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('should return error if invite not found', function (done) {
        inviteEntityMock.findById = sinon.stub().returns(Q.resolve());

        invitesApi.updateInviteStatus(inviteId, true, userStub.id)
            .then(function(){
                assertPostgressTransactionFailed();

                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('should return error if invite was not deleted', function (done) {
        inviteEntityMock.delete = sinon.stub().returns(Q.reject());

        invitesApi.updateInviteStatus(inviteId, false, userStub.id)
            .then(function(){
                assertPostgressTransactionFailed();

                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('should return error if user was not found in DB', function (done) {

        userEntityMock.updateByEmail = sinon.stub().returns(Q.resolve());

        invitesApi.updateInviteStatus(inviteId, true, userStub.id)
            .then(function(){
                assertPostgressTransactionFailed();

                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('should return error if user was not updated in DB', function (done) {

        userEntityMock.updateByEmail = sinon.stub().returns(Q.reject());

        invitesApi.updateInviteStatus(inviteId, true, userStub.id)
            .then(function(){
                assertPostgressTransactionFailed();

                done();
            })
            .catch(function (err) {
                done(err);
            });
    });


    it('should return error if invite was not updated', function (done) {

        inviteEntityMock.delete = sinon.stub().returns(Q.reject());

        invitesApi.updateInviteStatus(inviteId, true, userStub.id)
            .then(function(){
                assertPostgressTransactionFailed();

                expect(userEntityMock.updateByEmail.calledOnce).to.be(true);
                expect(inviteEntityMock.delete.calledOnce).to.be(true);
                done();
            })
            .catch(function (err) {
                done(err);
            });
    });
});
