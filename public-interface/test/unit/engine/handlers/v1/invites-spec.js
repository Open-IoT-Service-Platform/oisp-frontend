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
    errBuilder = require('../../../../../lib/errorHandler').errBuilder,
    Q = require('q'),
    invitesHandler = rewire('../../../../../engine/handlers/v1/invites'),
    uuid = require('uuid'),
    httpStatuses = require('../../../../../engine/res/httpStatuses');

describe('invites handler', function () {
    var user,
        inviteStub,
        userMock,
        invitesMock,
        callback,
        nextCallback,
        responseCode;

    var email = "test@example.com";
    var reqStub;
    var error = errBuilder.Errors.Generic.InternalServerError;

    var inviteId = 1;

    function prepareStubs() {
        user = {
            email: email,
            id: 1
        };

        inviteStub = {
            inviteId: inviteId,
            domainId: uuid.v4(),
            email: email
        };

        reqStub = {
            params: {
                inviteId: inviteId,
                accountId: uuid.v4(),
                email: email
            },
            identity: uuid.v4(),
            body: {
                accept: true,
                email: email
            },
            forwardedHeaders: {}
        };
    }

    beforeEach(function () {
        Q.longStackSupport = true;

        prepareStubs();

        userMock = {
            getUser: sinon.stub().yields(null, user),
            isUserSoleAdminForAccount: sinon.stub().yields(null, true),
            deleteUserFromAccount: sinon.stub().returns(Q.resolve())
        };
        invitesMock = {
            deleteByEmailAndAccount: sinon.stub().returns(Q.resolve()),
            getInvite: sinon.stub().callsArgWith(1, null, inviteStub),
            updateInviteStatus: sinon.stub().returns(Q.resolve(inviteStub)),
            addInvite: sinon.stub().callsArgWith(3, null, inviteStub),
            getInvites: sinon.stub().callsArgWith(1, null, inviteStub),
            getUserInvites: sinon.stub().callsArgWith(1, null, inviteStub),
            delInvite: sinon.stub().yields(null)
        };

        callback = {
            send: sinon.spy(),
            status: function(code) {
                responseCode = code;
                return this;
            }
        };

        nextCallback = sinon.spy();

        responseCode = null;

        invitesHandler.__set__('user', userMock);
        invitesHandler.__set__('invites', invitesMock);
    });

    var expectResponseCode = function (code, body) {
        expect(callback.send.calledOnce).to.equal(true);
        expect(responseCode).to.eql(code);
        if (body) {
            expect(callback.send.calledWith(body)).to.equal(true);
        }
    };

    var expectOkResponse = function(body) {
        expectResponseCode(httpStatuses.OK.code);
        if (body) {
            expect(callback.send.calledWith(body)).to.equal(true);
        }
    };

    var expectCreatedResponse = function(body) {
        expectResponseCode(httpStatuses.Created.code);
        if (body) {
            expect(callback.send.calledWith(body)).to.equal(true);
        }
    };

    describe('get user invites', function () {
        it('should get user invites', function (done) {
            invitesHandler.getUserInvites(reqStub, callback);

            expectOkResponse(inviteStub);
            done();
        });

        it('should response with error if getInvites failed', function (done) {
            invitesMock.getUserInvites = sinon.stub().callsArgWith(1, error);

            invitesHandler.getUserInvites(reqStub, callback);

            expectResponseCode(errBuilder.Errors.Invite.NotFound.code, errBuilder.Errors.Invite.NotFound.message);
            done();
        });

        it('should response with error if user was not found', function (done) {
            userMock.getUser = sinon.stub().callsArgWith(1, error);

            invitesHandler.getUserInvites(reqStub, callback);

            expectResponseCode(errBuilder.Errors.User.NotFound.code, errBuilder.Errors.User.NotFound.message);
            done();
        });

        it('should response with error if user email does not match email from param', function (done) {
            reqStub.params.email = 'wrongemail@example.com';

            invitesHandler.getUserInvites(reqStub, callback);

            expectResponseCode(errBuilder.Errors.Generic.NotAuthorized.code, errBuilder.Errors.Generic.NotAuthorized.message);
            done();
        });

        it('should response with error if request params are missing', function (done) {
            delete reqStub.params;

            invitesHandler.getUserInvites(reqStub, callback);

            expectResponseCode(errBuilder.Errors.Generic.InvalidRequest.code, errBuilder.Errors.Generic.InvalidRequest.message);
            done();
        });
    });

    describe('get invites', function () {
        it('should get invites', function (done) {
            invitesHandler.getInvites(reqStub, callback);

            expectOkResponse(inviteStub);
            done();
        });

        it('should response with error if getInvites failed', function (done) {
            invitesMock.getInvites = sinon.stub().callsArgWith(1, error);

            invitesHandler.getInvites(reqStub, callback);

            expectResponseCode(errBuilder.Errors.Invite.NotFound.code, errBuilder.Errors.Invite.NotFound.message);
            done();
        });

        it('should response with error if request params are missing', function (done) {
            delete reqStub.params;

            invitesHandler.getInvites(reqStub, callback);

            expectResponseCode(errBuilder.Errors.Generic.InvalidRequest.code, errBuilder.Errors.Generic.InvalidRequest.message);
            done();
        });
    });

    describe('add invite', function () {
        it('should add invite', function (done) {
            invitesHandler.addInvite(reqStub, callback);

            expectCreatedResponse();
            done();
        });

        it('should response with error if addInvite failed', function (done) {
            invitesMock.addInvite = sinon.stub().callsArgWith(3, error);

            invitesHandler.addInvite(reqStub, callback);

            expectResponseCode(errBuilder.Errors.Generic.InternalServerError.code, errBuilder.Errors.Generic.InternalServerError.message);
            done();
        });

        it('should response with error if request body is missing', function (done) {
            delete reqStub.body;

            invitesHandler.addInvite(reqStub, callback);

            expectResponseCode(errBuilder.Errors.Generic.InvalidRequest.code, errBuilder.Errors.Generic.InvalidRequest.message);
            done();
        });

        it('should response with error if request params are missing', function (done) {
            delete reqStub.params;

            invitesHandler.addInvite(reqStub, callback);

            expectResponseCode(errBuilder.Errors.Generic.InvalidRequest.code, errBuilder.Errors.Generic.InvalidRequest.message);
            done();
        });
    });

    describe('update invite status', function () {
        it('should update invite status', function (done) {
            invitesHandler.updateInviteStatus(reqStub, callback)
                .done(function () {
                    expectOkResponse();
                    done();
                });
        });

        it('should response with error if update invitation in DB failed', function (done) {
            invitesMock.updateInviteStatus = sinon.stub().returns(Q.reject(errBuilder.Errors.Generic.InternalServerError));

            invitesHandler.updateInviteStatus(reqStub, callback)
                .done(function () {
                    expectResponseCode(errBuilder.Errors.Generic.InternalServerError.code, errBuilder.Errors.Generic.InternalServerError.message);
                    done();
                });
        });

        it('should response with error if user was not found', function (done) {
            invitesMock.updateInviteStatus = sinon.stub().returns(Q.reject(errBuilder.Errors.Generic.NotAuthorized));

            invitesHandler.updateInviteStatus(reqStub, callback)
                .done(function () {
                    expectResponseCode(errBuilder.Errors.Generic.NotAuthorized.code, errBuilder.Errors.Generic.NotAuthorized.message);
                    done();
                });
        });

        it('should response with error if invite was not found', function (done) {
            invitesMock.updateInviteStatus = sinon.stub().returns(Q.reject(errBuilder.Errors.Invite.NotFound));

            invitesHandler.updateInviteStatus(reqStub, callback)
                .done(function () {
                    expectResponseCode(errBuilder.Errors.Invite.NotFound.code, errBuilder.Errors.Invite.NotFound.message);
                    done();
                });
        });

        it('should response with error if request body is missing', function (done) {
            delete reqStub.body;

            invitesHandler.updateInviteStatus(reqStub, callback);

            expectResponseCode(errBuilder.Errors.Generic.InvalidRequest.code, errBuilder.Errors.Generic.InvalidRequest.message);
            done();
        });

        it('should response with error if request params are missing', function (done) {
            delete reqStub.params;

            invitesHandler.updateInviteStatus(reqStub, callback);

            expectResponseCode(errBuilder.Errors.Generic.InvalidRequest.code, errBuilder.Errors.Generic.InvalidRequest.message);
            done();
        });
    });

    describe('deleteUser', function () {
        it('should delete invite and delete user from account if user is not sole admin', function (done) {

            userMock.isUserSoleAdminForAccount = sinon.stub().yields(null, false);
            invitesHandler.deleteUser(reqStub, callback)
                .done(function () {
                    expect(invitesMock.delInvite.calledOnce).to.be(true);

                    expectOkResponse();
                    done();
                }
            );
        });


        it('should response with error if delete user is failed', function (done) {

            userMock.deleteUserFromAccount = sinon.stub().returns(Q.reject(error));
            userMock.isUserSoleAdminForAccount = sinon.stub().yields(null, false);


            userMock.deleteByEmailAndAccount = sinon.stub().yields(error);

            invitesHandler.deleteUser(reqStub, callback, nextCallback)
                .done(function () {

                    expect(invitesMock.delInvite.calledOnce).to.be(true);

                    done();
                }
            );
        });
    });
});
