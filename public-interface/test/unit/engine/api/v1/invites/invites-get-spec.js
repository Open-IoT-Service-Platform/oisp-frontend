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
    Q = require('q'),
    invitesApi = rewire('../../../../../../engine/api/v1/invites'),
    errBuilder = require("../../../../../../lib/errorHandler").errBuilder,
    uuid = require('uuid');

describe('invitesApi.getInvites', function () {

    var inviteEntityMock;

    var inviteStub;

    var inviteId = 1,
        callback,
        error;

    function prepareStub() {
        inviteStub = {
            inviteId: inviteId,
            domainId: uuid.v4()
        };
        error = "error";
    };

    function prepareMocks() {
        inviteEntityMock = {
            findById: sinon.stub().returns(Q.resolve(inviteStub)),
            findByEmail: sinon.stub(),
            all: sinon.spy()
        };
    };

    beforeEach(function () {
        callback = sinon.spy();
        prepareStub();
        prepareMocks();
        invitesApi.__set__('invites', inviteEntityMock);
    });

    it('should return invites', function (done) {
        invitesApi.getInvites(1, callback);

        expect(inviteEntityMock.all.calledOnce).to.equal(true);

        done();
    });

    it('should return invite', function (done) {

        invitesApi.getInvite(1, callback);

        expect(inviteEntityMock.findById.calledOnce).to.be.equal(true);

        done();

    });

    it('should return user invites', function (done) {

        invitesApi.getUserInvites(1, callback);

        expect(inviteEntityMock.findByEmail.calledOnce).to.be.equal(true);

        done();

    });

});
