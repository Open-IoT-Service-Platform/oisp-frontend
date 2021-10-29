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
    invitesApi = rewire('../../../../../../engine/api/v1/invites'),
    errBuilder = require("../../../../../../lib/errorHandler").errBuilder,
    uuid = require('uuid');

describe('invitesApi.addInvite', function () {

    var inviteEntityMock,
        userEntityMock,
        mailerMock;

    var inviteStub,
        userStub,
        accountStub;

    var inviteId = 1,
        callback,
        error,
        email,
        host;

    function prepareStub() {
        inviteStub = {
            inviteId: inviteId,
            domainId: uuid.v4()
        };
        userStub = {
            id: uuid.v4()
        };
        accountStub = {
            id: uuid.v4()
        };
        error = "error";
        email = "test@example.com";
        host = "example.host.com";
    };

    function prepareMocks() {
        inviteEntityMock = {
            new: sinon.stub().callsArgWith(2, null, inviteStub),
        };
        userEntityMock = {
            findByEmail: sinon.stub().callsArgWith(1, null, userStub),
            update: sinon.stub().callsArgWith(1, null),
            find: sinon.stub().callsArgWith(2, null)
        };

        mailerMock = {
            send: sinon.spy()
        };

        invitesApi.__set__('invites', inviteEntityMock);
        invitesApi.__set__('users', userEntityMock);
        invitesApi.__set__('mailer', mailerMock);


    };

    beforeEach(function () {
        callback = sinon.spy();
        prepareStub();
        prepareMocks();
    });

    it('should add a invite if it does not exist', function (done) {


        invitesApi.addInvite(accountStub.id, host, email, callback);

        expect(callback.calledOnce).to.be(true);
        expect(callback.args.length).to.equal(1);
        expect(callback.args[0].length).to.equal(2);
        expect(callback.args[0][1]).to.equal(inviteStub);
        expect(userEntityMock.find.calledOnce).to.be(true);
        expect(inviteEntityMock.new.calledOnce).to.be(true);
        expect(mailerMock.send.calledOnce).to.be(true);

        done();
    });

    it('should callback User.AlreadyInvited when user exists', function (done) {
        userEntityMock.find.callsArgWith(2, null, {});

        invitesApi.addInvite(accountStub.id, host, email, callback);

        expect(callback.calledOnce).to.be(true);
        expect(callback.args.length).to.equal(1);
        expect(callback.args[0].length).to.equal(1);
        expect(callback.args[0][0].code).to.equal(errBuilder.Errors.User.AlreadyInvited.code);
        expect(userEntityMock.find.calledOnce).to.be(true);
        expect(mailerMock.send.calledOnce).to.be(false);

        done();
    });

    it('should callback Generic.InternalServerError if find invite ends with exception', function (done) {

        userEntityMock.find.callsArgWith(2, {});

        invitesApi.addInvite(accountStub.id, host, email, callback);

        expect(callback.calledOnce).to.be(true);
        expect(callback.args.length).to.equal(1);
        expect(callback.args[0].length).to.equal(1);
        expect(callback.args[0][0].code).to.equal(errBuilder.Errors.Generic.InternalServerError.code);
        expect(userEntityMock.find.calledOnce).to.be(true);
        expect(mailerMock.send.calledOnce).to.be(false);

        done();
    });



    it('should return Generic.InternalServerError if invites new ends with exception', function (done) {

        inviteEntityMock.new.callsArgWith(2, {});

        invitesApi.addInvite(accountStub.id, host, email, callback);

        expect(callback.calledOnce).to.be(true);
        expect(callback.args.length).to.equal(1);
        expect(callback.args[0].length).to.equal(1);
        expect(callback.args[0][0].code).to.equal(errBuilder.Errors.Generic.InternalServerError.code);
        expect(userEntityMock.find.calledOnce).to.be(true);
        expect(inviteEntityMock.new.calledOnce).to.be(true);
        expect(mailerMock.send.calledOnce).to.be(false);

        done();
    });

});
