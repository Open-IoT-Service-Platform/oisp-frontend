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

describe('usersApi.changePassword', function () {
    var usersManager;
    var error;
    var errorObj;

    beforeEach(function () {
    	error = null;
    	errorObj = null;
        usersManager = rewire('../../../../../../engine/api/v1/users');
        Q.longStackSupport = true;
    });

    it('should not change password when password is too weak', function (done) {
        // prepare
        var email = "email@email",
            userIdentifier = "indentifier",
            data = {
                password: "weak"
            },
            callback = sinon.spy();
        error = errBuilder.build(2401);
        errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
        // execute
        usersManager.changePasswordOfUser(email, userIdentifier, data, callback);
        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.calledWith(sinon.match(errorObj))).to.equal(true);

        done();
    });

    it('should not change password when user is not found', function (done) {
        // prepare
        error = errBuilder.build(errBuilder.Errors.Generic.InvalidRequest);
        errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
        var email = "email@email",
            userIdentifier = "indentifier",
            data = {
                password: "VeryStrongPasswordWithSpecialCharacters123?"
            },
            callback = sinon.spy(),
            userMock = {
                findByEmail: sinon.stub().callsArgWith(1, error, null)
            };

        usersManager.__set__('user', userMock);
        // execute
        usersManager.changePasswordOfUser(email, userIdentifier, data, callback);
        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.calledWith(sinon.match(errorObj))).to.equal(true);

        done();
    });

    it('should not change password when user id is missing', function (done) {
        // prepare
        error = errBuilder.build(errBuilder.Errors.Generic.InvalidRequest);
        errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
        var user = {},
            userIdentifier = "indentifier",
            email = "email@email",
            data = {
                password: "VeryStrongPasswordWithSpecialCharacters123?"
            },
            callback = sinon.spy(),
            userMock = {
                findByEmail: sinon.stub().callsArgWith(1, null, user)
            };

        usersManager.__set__('user', userMock);
        // execute
        usersManager.changePasswordOfUser(email, userIdentifier, data, callback);
        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.calledWith(sinon.match(errorObj))).to.equal(true);

        done();
    });

    it('should not change password when given old password is incorrect', function (done) {
        // prepare
    	error = errBuilder.build(errBuilder.Errors.Generic.InvalidRequest);
    	errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
        var user = {
                id: uuid.v4(),
                password: "OldPassword",
                salt: "salt"
            },
            email = "email@email",
            userIdentifier = user.id,
            data = {
                currentpwd: "oldPassword",
                password: "VeryStrongPasswordWithSpecialCharacters123?"
            },
            callback = sinon.spy(),
            userMock = {
                findByEmail: sinon.stub().callsArgWith(1, null, user)
            },
            cryptoUtilsMock = {
                verify: sinon.stub().callsArgWith(3, false)
            };

        usersManager.__set__('user', userMock);
        usersManager.__set__('cryptoUtils', cryptoUtilsMock);
        // execute
        usersManager.changePasswordOfUser(email, userIdentifier, data, callback);
        // attest
        expect(callback.calledOnce).to.equal(true);
        expect(callback.calledWith(sinon.match(errorObj))).to.equal(true);

        done();
    });


});
