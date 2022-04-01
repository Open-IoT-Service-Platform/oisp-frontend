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

describe('usersApi.getUser', function () {
    var usersManager,
        user,
        accId,
        userMock,
        callback;

    beforeEach(function () {
        usersManager = rewire('../../../../../../engine/api/v1/users');
        Q.longStackSupport = true;

        user = {
            userId: 1,
        };
        accId = uuid.v4();
        callback = sinon.spy();

        userMock = {
            findByIdWithAccountDetails: sinon.stub().callsArgWith(1, null, user)
        };

        usersManager.__set__('user', userMock);
    });

    it('should get a user if exists', function (done) {
        // prepare

        // execute
        usersManager.getUser(1, callback);

        // attest
        expect(callback.calledWith(null, user)).to.equal(true);
        expect(user.userId).to.equal(1);
        done();
    });

    it('should get a user with accounts if exists', function (done) {
        // prepare
        user.accounts = {};
        user.accounts[accId] = {};
        // execute
        usersManager.getUser(1, callback);

        // attest
        expect(callback.getCall(0).args[1].accounts).to.not.equal(null);
        expect(user.userId).to.equal(1);
        done();
    });

    it('should call callback with 2404 error code if user does not exist', function (done) {
        // prepare
        var error = errBuilder.build(errBuilder.Errors.User.NotFound);
        userMock.findByIdWithAccountDetails = sinon.stub().callsArgWith(1, error, null);

        // execute
        usersManager.getUser(1, callback);

        // attest
        expect(callback.calledOnce).to.be(true);
        expect(callback.args[0].length).to.equal(1);
        expect(callback.args[0][0].code).to.equal(error.code);

        done();
    });
});

describe('usersApi.searchUsers', function () {

    var usersManager,
        user,
        userMock,
        callback;

    beforeEach(function () {
        usersManager = rewire('../../../../../../engine/api/v1/users');
        Q.longStackSupport = true;

        user = {userId: 1};
        callback = sinon.spy();

        userMock = {
            findByEmail: sinon.stub().callsArgWith(1, null, user)
        };

        usersManager.__set__('user', userMock);

    });

    it('should return a user', function (done) {
        // prepare
        // execute
        usersManager.searchUser('test@user', callback);

        // attest
        expect(callback.calledWith(null, user)).to.equal(true);

        done();
    });

    it('should call callback with 2404 error code if filter returns an error', function (done) {
        // prepare
        var error = errBuilder.build(errBuilder.Errors.User.NotFound);
        userMock.findByEmail =  sinon.stub().callsArgWith(1, error, null);

        // execute
        usersManager.searchUser('test@user', callback);

        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(1);
        expect(callback.args[0][0].code).to.equal(error.code);

        done();
    });
});

describe('get users', function () {

    var usersManager,
        users,
        userMock,
        callback;

    beforeEach(function () {
        usersManager = rewire('../../../../../../engine/api/v1/users');
        Q.longStackSupport = true;

        users = [
            {userId: 1},
            {userId: 2}
        ];
        callback = sinon.spy();

        userMock = {
            getUsers: sinon.stub().callsArgWith(2, null, users)
        };

        usersManager.__set__('user', userMock);

    });

    it('should return users', function (done) {

        // execute
        usersManager.getUsers(1, {}, callback);

        // attest
        expect(callback.calledWith(null, users)).to.equal(true);
        expect(callback.calledOnce).to.equal(true);

        done();
    });
});
