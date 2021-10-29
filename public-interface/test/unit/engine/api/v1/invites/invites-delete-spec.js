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

describe('invitesApi.delInvite', function () {

    var inviteEntityMock,
        callback,
        error,
        inviteStub;


    function prepareStub() {
        inviteStub = {
            inviteId: 1,
            domainId: uuid.v4()
        };

        error = "error";
    };

    function prepareMocks() {
        inviteEntityMock = {
            findById: sinon.stub().callsArgWith(1, null, inviteStub),
            delete: sinon.stub().callsArgWith(1, null),
            deleteByEmailAndAccount: sinon.stub().callsArgWith(2, null)
        };
    };

    beforeEach(function () {
        callback = sinon.spy();
        prepareStub();
        prepareMocks();
        invitesApi.__set__('invites', inviteEntityMock);
    });

    it('should return success if invite was deleted', function (done) {



        invitesApi.delInvite(uuid.v4(), "test@example.com", function (err) {
            expect(inviteEntityMock.deleteByEmailAndAccount.calledOnce).to.be(true);
            expect(err).to.eql(null);
            done();
        });
    });

    it('should return error if invite was not deleted', function (done) {

        inviteEntityMock.deleteByEmailAndAccount = sinon.stub().callsArgWith(2, error);



        invitesApi.delInvite(uuid.v4(), "test@example.com", function (err) {
            expect(inviteEntityMock.deleteByEmailAndAccount.calledOnce).to.be(true);
            expect(err).to.eql(error);
            done();
        });
    });
});
