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

describe('usersApi.isUserSoleAdminForAccount', function () {
    var usersManager;

    beforeEach(function () {
        usersManager = rewire('../../../../../../engine/api/v1/users');
        Q.longStackSupport = true;
    });

    it('should return true if there is one user', function (done) {
        // prepare
        var users = [
                {id: 1, accounts: {"1": "admin"}}
            ],
            mock = {
                all: sinon.stub().callsArgWith(1, null, users)
            },
            callback = sinon.spy();
        usersManager.__set__('user', mock);

        // execute
        usersManager.isUserSoleAdminForAccount(1, 1, callback);

        // attest
        expect(callback.calledWith(null, true)).to.equal(true);

        done();
    });
    it('should return false if there is more than one admin user', function (done) {
        // prepare
        var users = [
                {id: 1, accounts: {"1": "admin"}},
                {id: 2, accounts: {"1": "admin"}}
            ],
            mock = {
                all: sinon.stub().callsArgWith(1, null, users)
            },
            callback = sinon.spy();
        usersManager.__set__('user', mock);

        // execute
        usersManager.isUserSoleAdminForAccount(1, 1, callback);

        // attest
        expect(callback.calledWith(null, false)).to.equal(true);

        done();
    });
    it('should return error if database problem is encountered', function (done) {
        // prepare
        var error = errBuilder.Errors.Generic.InternalServerError.code,
            mock = {
                all: sinon.stub().callsArgWith(1, error, null)
            },
            callback = sinon.spy();
        usersManager.__set__('user', mock);

        // execute
        usersManager.isUserSoleAdminForAccount(1, 1, callback);

        // attest
        expect(callback.calledWith(error, null)).to.equal(true);
        expect(callback.calledOnce).to.equal(true);

        done();
    });

    it('should return true if there is one user', function (done) {
        // prepare
        var users = [
                {id: 1, accounts: {"1": "admin"}}
            ],
            mock = {
                all: sinon.stub().callsArgWith(1, null, users)
            },
            callback = sinon.spy();
        usersManager.__set__('user', mock);

        // execute
        usersManager.isUserSoleAdminForAccount(1, 1, callback);

        // attest
        expect(callback.calledWith(null, true)).to.equal(true);

        done();
    });
    it('should return false if there is more than one admin user', function (done) {
        // prepare
        var users = [
                {id: 1, accounts: {"1": "admin"}},
                {id: 2, accounts: {"1": "admin"}}
            ],
            mock = {
                all: sinon.stub().callsArgWith(1, null, users)
            },
            callback = sinon.spy();
        usersManager.__set__('user', mock);

        // execute
        usersManager.isUserSoleAdminForAccount(1, 1, callback);

        // attest
        expect(callback.calledWith(null, false)).to.equal(true);

        done();
    });
});
