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

var expect = require('expect.js'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    authentication = rewire('../../../../lib/security/authentication'),
    config = require('../../../../config'),
    users = require('../../../../engine/api/v1/users'),
    cryptoUtil = require('../../../../lib/cryptoUtils'),
    uuid = require('uuid'),
    Q = require('q'),
    errBuilder  = require("../../../../lib/errorHandler").errBuilder;

describe("Authentication API tests", function () {
    var testEmail = 'test@example.com';
    var strategies = {};
    var userLockManagerMock = {
        isUserLocked: sinon.stub().returns(Q.reject()),
        removeLockForUser: sinon.stub().returns(Q.resolve()),
        incrementLoginFailedCount: sinon.stub().returns(Q.resolve()),
        userLockedMsg: sinon.spy()
    };
    var passportMock = {
        initialize: function(){
            return function(req, res, next) {
                next();
            };
        },
        use: function (strategy) {
            strategies[strategy.name] = strategy;
            return this;
        },
        authenticate: function(strategyName){
            return function(){
                strategies[strategyName]();
            };
        }
    };

    beforeEach(function(){
        authentication.__set__('passport', passportMock);
        authentication.__set__('userLockManager', userLockManagerMock);

        authentication(config.auth);
    });


    describe("#localStrategies", function() {

        it('Should login a local user', function(done){
            users.searchUser = sinon.stub().callsArgWith(1, null, {
                email:testEmail, salt: 'salt', password: 'password', verified: true, termsAndConditions: true });
            cryptoUtil.verify = sinon.stub().callsArgWith(3, true);

            strategies.local._verify(testEmail, 'passwd', function(err, usr){
                expect(err).to.be.equal(null);
                expect(usr).not.to.be.equal(false);
                expect(usr.email).not.to.be.equal(null);
                expect(usr.salt).to.be.equal(undefined);
                expect(usr.password).to.be.equal(undefined);
                expect(cryptoUtil.verify.calledOnce).to.equal(true);
                expect(users.searchUser.calledOnce).to.equal(true);
            });
            done();
        });

        it('Should fail on login local user due to invalid password', function(done){
            users.searchUser = sinon.stub().callsArgWith(1, null, {
                email:testEmail, salt: 'salt', password: 'password', verified: true, termsAndConditions: true});
            cryptoUtil.verify = sinon.stub().callsArgWith(3, false);

            strategies.local._verify(testEmail, 'passwd', function(err, usr){
                expect(err).to.be.equal(null);
                expect(usr).to.be.equal(false);
                expect(users.searchUser.calledOnce).to.equal(true);
                expect(cryptoUtil.verify.calledOnce).to.equal(true);
            });
            done();
        });

        it('Should fail on login local user due to user not found', function(done){
            users.searchUser = sinon.stub().callsArgWith(1, { code:404 }, null);
            cryptoUtil.verify = sinon.spy();

            strategies.local._verify('test@user', 'passwd', function(err, usr){
                expect(err).to.be.equal(null);
                expect(usr).to.be.equal(false);
                expect(users.searchUser.calledOnce).to.equal(true);
                expect(cryptoUtil.verify.notCalled).to.equal(true);
            });
            done();
        });
    });

});
