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
    errBuilder = require('../../../../../../lib/errorHandler/index').errBuilder,
    usersManager = rewire('../../../../../../engine/api/v1/users');

describe('usersApi.addUser', function () {
    var user,
        userMock,
        postgresProviderMock,
        configStub,
        mailerMock,
        userInteractionTokenMock;

    beforeEach(function () {

        Q.longStackSupport = true;

        user = {termsAndConditions: true, email: 'test@user', password: uuid.v4()};

        userMock = {
            new: sinon.stub().returns(Q.resolve(user)),
            findByEmail: sinon.stub().callsArgWith(1, null, user)
        };

        userInteractionTokenMock = {
            new: sinon.stub().callsArgWith(1, null, {id:1}),
            TYPE: {
                ACTIVATE_USER: 'activate-user'
            }
        };

        postgresProviderMock = {
            startTransaction: sinon.stub().returns(Q.resolve()),
            rollback: sinon.stub(),
            commit: sinon.stub()
        };

        configStub = {
            verifyUserEmail: true,
            biz: {
                domain: {
                    defaultHealthTimePeriod: 86400, // 1 day in secs
                    defaultPasswordTokenExpiration: 60, // in minutes
                    defaultActivateTokenExpiration: 60, // in minutes
                    defaultPasswordResetPath: '/ui/auth#/resetPassword?token=',
                    defaultActivatePath: '/ui/auth#/activate?token='
                }
            }
        };

        mailerMock = {
            send: sinon.spy()
        };

        usersManager.__set__('userInteractionToken', userInteractionTokenMock);
        usersManager.__set__('mailer', mailerMock);
        usersManager.__set__('user', userMock);
        usersManager.__set__('postgresProvider', postgresProviderMock);
        usersManager.__set__('config', configStub);
    });

    it('should add a user if it does not exist', function (done) {
        // execute
        usersManager.addUser(user, 'host')
            .then(function() {
                // attest
                expect(userMock.new.calledOnce).to.equal(true);

                done();
            }).catch(function(err){
                done(err);
            });
    });

    it('should add a user without sending email if data provider is given', function (done) {
        // prepare
        user.provider = 'google';

        // execute
        usersManager.addUser(user, '')
            .done(function() {
                // attest
                expect(userMock.new.calledOnce).to.equal(true);

                done();
            });
    });

    it('should not add a user when error occurs during saving', function (done) {
        // prepare
        var error = {code: 2501};
        userMock.new = sinon.stub().returns(Q.reject(error));

        // execute
        usersManager.addUser(user, 'host')
            .catch(function(err) {
                expect(err.code).to.equal(error.code);
            })
            .done(function() {
                // attest
                expect(userMock.new.calledOnce).to.equal(true);

                done();
            });
    });


    it('should call callback with a 2401 error code when an the password is too weak', function (done) {
        // prepare
        user.password = '1234';

        // execute

        usersManager.addUser(user, 'host')
            .catch(function (ex) {
                expect(ex.code).to.be.equal(2401);
            })
            .done(function() {
                done();
            });
    });
});
