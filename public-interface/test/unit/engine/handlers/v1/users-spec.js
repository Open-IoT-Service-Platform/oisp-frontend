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
    usersHandler = rewire('../../../../../engine/handlers/v1/users'),
    users = require('../../../../../engine/api/v1/users'),
    uuid = require('uuid'),
    httpStatuses = require('../../../../../engine/res/httpStatuses'),
    Q = require('q'),
    errBuilder  = require("../../../../../lib/errorHandler/index").errBuilder;


describe('users handler', function(){
    var reqMock, resMock, nextMock, attributesValidationMock, errorCode, responseCode, error, errorObj;

    var expectResponseCode = function (code) {
        expect(resMock.send.calledOnce).to.equal(true);
        expect(responseCode).to.eql(code);
    };

    var expectOkResponse = function() {
        expectResponseCode(httpStatuses.OK.code);
    };

    var expectDeleteOkResponse = function() {
        expectResponseCode(httpStatuses.DeleteOK.code);
    };

    beforeEach(function() {
    	error = null;
    	errorObj = null;
        reqMock = {
            params: {
                accountId: uuid.v4(),
                userId: '1',
                category: 'category',
                settingId: 1
            },
            body: {
                id: '1',
                accounts: {
                    '1': 'admin'
                },
                email: 'email@email',
                token: 'token',
                password: 'password',
                currentpwd: 'password'
            },
            forwardedHeaders: {
                baseUrl: 'https://dashboard.enableiot.com'
            },
            query: {},
            identity: uuid.v4()
        };
        resMock = {
            send: sinon.spy(),
            setHeader: sinon.spy(),
            status: function(code) {
                responseCode = code;
                return this;
            }
        };
        attributesValidationMock = {
            checkLimitsForAttributes: sinon.stub()
        };
        nextMock = sinon.spy();
        errorCode = 500;

        responseCode = null;
    });

    describe('usage', function() {
        it('usage', function (done) {
            // prepare// execute
            usersHandler.usage(reqMock, resMock);
            // attest
            expect(resMock.send.calledOnce).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);

            done();
        });
    });
    describe('get users', function(){
        it('should return a list of users', function(done) {
            var usersList = [
                {
                    email: "admin@user.mail",
                    verified: true,
                    role: "user"
                },
                {
                    email: "another@user.mail",
                    verified: false,
                    role: "user"
                }
            ];
            var authMock = {
                isAdminForAccountInUri: sinon.stub().callsArgWith(2, true, true, "12345")
            };
            usersHandler.__set__('auth', authMock);
            users.getUsers = sinon.stub().callsArgWith(2, null, usersList);
            usersHandler.getUsers(reqMock, resMock, nextMock);
            expect(resMock.send.calledWith(200, usersList));
            expect(resMock.send.calledOnce).to.be.equal(true);
            expect(nextMock.notCalled).to.be.equal(true);
            expect(users.getUsers.calledOnce).to.be.equal(true);
            done();
        });
        it('should return an empty list of users', function(done) {
            users.getUsers = sinon.stub().callsArgWith(2, null, []);
            var authMock = {
                isAdminForAccountInUri: sinon.stub().callsArgWith(2, true, true, "12345")
            };
            usersHandler.__set__('auth', authMock);
            usersHandler.getUsers(reqMock, resMock, nextMock);
            expect(resMock.send.calledWith(200, []));
            expect(resMock.send.calledOnce).to.be.equal(true);
            expect(nextMock.notCalled).to.be.equal(true);
            expect(users.getUsers.calledOnce).to.be.equal(true);
            done();
        });
        it('should return an error', function(done) {
            users.getUsers = sinon.stub().callsArgWith(2, {});
            var authMock = {
                isAdminForAccountInUri: sinon.stub().callsArgWith(2, true, true, "12345")
            };
            usersHandler.__set__('auth', authMock);
            usersHandler.getUsers(reqMock, resMock, nextMock);
            expect(resMock.send.notCalled).to.be.equal(true);
            expect(nextMock.calledOnce).to.be.equal(true);
            expect(users.getUsers.calledOnce).to.be.equal(true);
            done();
        });
    });

    describe('user role update', function() {
        it('should not change role of user - user who is not an admin tried change a role', function (done) {
            // prepare
            var accountId = '1',
                authMock = {
                    isAdminForAccountInUri: sinon.stub().callsArgWith(2, false, false, accountId)
                },
                userApiMock = {
                    updateUser: sinon.stub().callsArgWith(2, null)
                };

            usersHandler.__set__('auth', authMock);
            usersHandler.__set__('users', userApiMock);
            var callback = sinon.spy(),
                data = {
                    id: '1'
                };
            //execute
            usersHandler.updateUserRoleForYourAccount(reqMock, resMock, nextMock);
            expect(userApiMock.updateUser.calledOnce).to.be.equal(false);
            done();
        });
        it('should change role of user - user who is an admin tried change a role', function (done) {
            // prepare
            var accountId = '1',
                authMock = {
                    isAdminForAccountInUri: sinon.stub().callsArgWith(2, true, false, accountId)
                },
                userApiMock = {
                    updateUser: sinon.stub().returns(Q.resolve())
                };

            usersHandler.__set__('auth', authMock);
            usersHandler.__set__('users', userApiMock);
            var callback = sinon.spy(),
                data = {
                    id: accountId,
                    accounts: {

                    }
                };
            reqMock.body.accounts[reqMock.params.accountId] = "admin";
            //execute
            usersHandler.updateUserRoleForYourAccount(reqMock, resMock, nextMock);
            expect(userApiMock.updateUser.calledOnce).to.be.equal(true);
            expect(userApiMock.updateUser.getCall(0).args[0].id).to.be.equal(accountId);
            expect(userApiMock.updateUser.getCall(0).args[0].accounts[accountId]).to.be.equal('admin');
            done();
        });
    });

    describe('user update attributes or Terms of conditions', function() {
        it('should not update user attributes - is not an admin and he is not an owner of account', function (done) {
            // prepare
            var authMock = {
                    isAdminForAccountInUri: sinon.stub().callsArgWith(2, false, false)
                },
                userApiMock = {
                    updateUser: sinon.stub().returns(Q.resolve())
                };
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, null);

            usersHandler.__set__('auth', authMock);
            usersHandler.__set__('users', userApiMock);
            usersHandler.__set__('attributesValidation', attributesValidationMock);

            var callback = sinon.spy(),
                data = {
                    id: '1'
                };
            //execute
            usersHandler.updateUserAttributesOrTaC(reqMock, resMock, nextMock);
            expect(userApiMock.updateUser.calledOnce).to.be.equal(false);
            done();
        });
        it('should not update user attributes - if they did not pass validation', function (done) {
            // prepare
            var authMock = {
                    isAdminForAccountInUri: sinon.stub().callsArgWith(2, false, true)
                },
                attributesValidationErrors = [ 'Error'];
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, attributesValidationErrors);

            usersHandler.__set__('auth', authMock);
            usersHandler.__set__('attributesValidation', attributesValidationMock);

            //execute
            usersHandler.updateUserAttributesOrTaC(reqMock, resMock, nextMock);

            expect(nextMock.calledOnce).to.equal(true);
            expect(nextMock.args[0][0].code).to.equal(errBuilder.Errors.Generic.NotAuthorized.code);

            done();
        });
        it('should update user attributes - user is admin of account', function (done) {
            // prepare
            var authMock = {
                    isAdminForAccountInUri: sinon.stub().callsArgWith(2, true, false, reqMock.params.accountId)
                },
                userApiMock = {
                    updateUser: sinon.stub().returns(Q.resolve())
                };
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, null);

            reqMock.body.id = reqMock.params.accountId;
            reqMock.params.userId = reqMock.params.accountId;
            reqMock.identity = reqMock.params.accountId;

            usersHandler.__set__('auth', authMock);
            usersHandler.__set__('users', userApiMock);
            usersHandler.__set__('attributesValidation', attributesValidationMock);

            //execute
            usersHandler.updateUserAttributesOrTaC(reqMock, resMock, nextMock);
            expect(userApiMock.updateUser.calledOnce).to.be.equal(true);
            done();
        });
    });

    describe('get user', function() {
        it('should get user if request is valid and user exists', function(done) {
            // prepare
            var userRes = {
                    userId: reqMock.params.userId
                },
                userApiMock = {
                    getUser: sinon.stub().callsArgWith(1, null, userRes)
                };

            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.getUser(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.calledOnce).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(userApiMock.getUser.calledOnce).to.equal(true);
            expect(userApiMock.getUser.args[0].length).to.equal(2);
            expect(userApiMock.getUser.calledWith(reqMock.params.userId)).to.equal(true);

            done();
        });
        it('should not get user if something crashes and return error code', function(done) {
            // prepare
            var error = new Error(errorCode),
                userApiMock = {
                    getUser: sinon.stub().callsArgWith(1, error, null)
                };

            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.getUser(reqMock, {}, nextMock);

            // attest
            expect(nextMock.calledWith(error)).to.equal(true);
            expect(userApiMock.getUser.calledOnce).to.equal(true);
            expect(userApiMock.getUser.args[0].length).to.equal(2);
            expect(userApiMock.getUser.calledWith(reqMock.params.userId)).to.equal(true);

            done();
        });
    });

    describe('add user', function() {
        it('should add user if request is valid', function(done) {
            // prepare
            var userRes = {
                    userId: reqMock.params.userId
                },
                userApiMock = {
                    addUser: sinon.stub().returns(Q.resolve(userRes))
                };
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, null);

            usersHandler.__set__('users', userApiMock);
            usersHandler.__set__('attributesValidation', attributesValidationMock);

            // execute
            usersHandler.addUser(reqMock, resMock, nextMock)
                .then(function(){
                    // attest
                    expect(resMock.send.calledWith(userRes)).to.equal(true);
                    expect(responseCode).to.equal(httpStatuses.Created.code);
                    expect(userApiMock.addUser.calledOnce).to.equal(true);
                    expect(userApiMock.addUser.args[0].length).to.equal(2);
                    expect(userApiMock.addUser.calledWith(reqMock.body)).to.equal(true);

                    done();
                })
                .catch(function(err){
                    done(err);
                });


        });
        it('should not add user if something crashes and return error code', function(done) {
            // prepare
            var error = new Error(errorCode),
                userApiMock = {
                    addUser: sinon.stub().returns(Q.reject(error))
                };
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, null);

            usersHandler.__set__('users', userApiMock);
            usersHandler.__set__('attributesValidation', attributesValidationMock);

            // execute
            usersHandler.addUser(reqMock, {}, nextMock)
                .then(function(){
                    // attest
                    expect(nextMock.calledWith(error)).to.equal(true);
                    expect(userApiMock.addUser.calledOnce).to.equal(true);
                    expect(userApiMock.addUser.args[0].length).to.equal(2);
                    expect(userApiMock.addUser.calledWith(reqMock.body)).to.equal(true);

                    done();
                })
                .catch(function(err){
                    done(err);
                });


        });
        it('should not add user with attributes - if they did not pass validation', function (done) {
            // prepare
            var attributesValidationErrors = [ 'Error'];
            attributesValidationMock.checkLimitsForAttributes.callsArgWith(1, attributesValidationErrors);

            usersHandler.__set__('attributesValidation', attributesValidationMock);

            //execute
            usersHandler.addUser(reqMock, resMock, nextMock)
                .then(function(){
                    expect(nextMock.calledOnce).to.equal(true);
                    expect(nextMock.args[0][0].code).to.equal(httpStatuses.BadRequest.code);
                    expect(nextMock.args[0][0].errors).to.equal(attributesValidationErrors);
                    done();
                })
                .catch(function(err){
                    done(err);
                });


        });
    });
    describe('delete user', function() {
        it('should do nothing if user is not himself ', function (done) {
            // prepare
            var Q = {
                    nfcall: sinon.spy()
                },
                authApiMock = {
                    isAdminForAccountInUri: sinon.stub().callsArgWith(2, false, false)
                };

            usersHandler.__set__('auth', authApiMock);
            usersHandler.__set__('Q', Q);
            reqMock.identity =  uuid.v4();
            // execute
            usersHandler.deleteUser(reqMock, {}, nextMock);

            // attest

            expect(Q.nfcall.called).to.equal(false);

            done();
        });
    });
    describe('add password token', function() {
        it('should add password token if request is valid and user exists', function(done) {
            // prepare
            var userRes = {
                    userId: reqMock.params.userId
                },
                userApiMock = {
                    addPasswordToken: sinon.stub().callsArgWith(2, null, userRes)
                };

            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.addPasswordToken(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.calledWith(userRes)).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(userApiMock.addPasswordToken.calledOnce).to.equal(true);
            expect(userApiMock.addPasswordToken.args[0].length).to.equal(3);
            expect(userApiMock.addPasswordToken.calledWith(reqMock.body.email)).to.equal(true);

            done();
        });
        it('should not add password token if something crashes and return error code', function(done) {
            // prepare
            var error = new Error(errorCode),
                userApiMock = {
                    addPasswordToken: sinon.stub().callsArgWith(2, error, null)
                };

            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.addPasswordToken(reqMock, {}, nextMock);

            // attest
            expect(nextMock.calledWith(error)).to.equal(true);
            expect(userApiMock.addPasswordToken.calledOnce).to.equal(true);
            expect(userApiMock.addPasswordToken.args[0].length).to.equal(3);
            expect(userApiMock.addPasswordToken.calledWith(reqMock.body.email)).to.equal(true);

            done();
        });
        it('should not add password and return error code if params are not correct', function (done) {
        	error = errBuilder.build(errBuilder.Errors.User.InvalidData);
        	errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
            // prepare
            var userApiMock = {
                addPasswordToken: sinon.stub().callsArgWith(2, {}, null)
            };
            var req = {
                body: {}
            };
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.addPasswordToken(req, {}, nextMock);

            // attest
            expect(nextMock.calledWith(sinon.match(errorObj))).to.equal(true);
            expect(userApiMock.addPasswordToken.called).to.equal(false);

            done();
        });
    });
    describe('get password token', function() {
        it('should get password token if request is valid and user exists', function(done) {
            // prepare
            var userRes = {
                    token: 'token'
                },
                userApiMock = {
                    getPasswordToken: sinon.stub().callsArgWith(1, null, userRes)
                };
            reqMock.query.token = 'token';

            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.getPasswordToken(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.calledWith(userRes)).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(userApiMock.getPasswordToken.calledOnce).to.equal(true);
            expect(userApiMock.getPasswordToken.args[0].length).to.equal(2);
            expect(userApiMock.getPasswordToken.calledWith(reqMock.query.token)).to.equal(true);

            done();
        });
        it('should not get password token if something crashes and return error code', function(done) {
            // prepare
            var error = new Error(errorCode),
                userApiMock = {
                    getPasswordToken: sinon.stub().callsArgWith(1, error, null)
                };
            reqMock.query.token = 'token';

            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.getPasswordToken(reqMock, {}, nextMock);

            // attest
            expect(nextMock.calledWith(error)).to.equal(true);
            expect(userApiMock.getPasswordToken.calledOnce).to.equal(true);
            expect(userApiMock.getPasswordToken.args[0].length).to.equal(2);
            expect(userApiMock.getPasswordToken.calledWith(reqMock.query.token)).to.equal(true);

            done();
        });
        it('should not get password and return error code if params are not correct', function (done) {
            // prepare
        	error = errBuilder.build(errBuilder.Errors.Generic.InvalidRequest);
        	errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
            var userApiMock = {
                getPasswordToken: sinon.stub().callsArgWith(1, {}, null)
            };
            var req = {
                query: {}
            };
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.getPasswordToken(req, {}, nextMock);

            // attest
            expect(nextMock.calledWith(sinon.match(errorObj))).to.equal(true);
            expect(userApiMock.getPasswordToken.called).to.equal(false);

            done();
        });
    });
    describe('change password', function() {
        it('should change password if request is valid and user exists', function (done) {
            // prepare
            var userApiMock = {
                changePassword: sinon.stub().callsArgWith(1, false)
            };

            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.changePassword(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.calledOnce).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(userApiMock.changePassword.calledOnce).to.equal(true);
            expect(userApiMock.changePassword.args[0].length).to.equal(2);
            expect(userApiMock.changePassword.calledWith(reqMock.body)).to.equal(true);

            done();
        });
        it('should not change password if something crashes and return error code', function (done) {
            // prepare
            var error = new Error(errorCode),
                userApiMock = {
                    changePassword: sinon.stub().callsArgWith(1, error)
                };

            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.changePassword(reqMock, {}, nextMock);

            // attest
            expect(nextMock.calledWith(error)).to.equal(true);
            expect(userApiMock.changePassword.calledOnce).to.equal(true);
            expect(userApiMock.changePassword.args[0].length).to.equal(2);
            expect(userApiMock.changePassword.calledWith(reqMock.body)).to.equal(true);

            done();
        });
        it('should not change password and return error code if params are not correct', function (done) {
            // prepare
        	error = errBuilder.build(errBuilder.Errors.Generic.InvalidRequest);
        	errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
            var userApiMock = {
                changePassword: sinon.stub().callsArgWith(1, {})
            };
            var req = {
                body: {}
            };
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.changePassword(req, {}, nextMock);

            // attest
            expect(nextMock.calledWith(sinon.match(errorObj))).to.equal(true);
            expect(userApiMock.changePassword.called).to.equal(false);

            done();
        });
    });
    describe('change password using current password', function() {
        it('should change password if request is valid and user exists', function (done) {
            // prepare
            var userApiMock = {
                changePasswordOfUser: sinon.stub().callsArgWith(3, false)
            };

            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.changePasswordWithCurrentPwd(reqMock, resMock, nextMock);

            // attest
            expect(resMock.send.calledOnce).to.equal(true);
            expect(responseCode).to.equal(httpStatuses.OK.code);
            expect(userApiMock.changePasswordOfUser.calledOnce).to.equal(true);
            expect(userApiMock.changePasswordOfUser.args[0].length).to.equal(4);
            expect(userApiMock.changePasswordOfUser.calledWith(reqMock.params.email)).to.equal(true);

            done();
        });
        it('should not change password if something crashes and return error code', function (done) {
            // prepare
            var error = new Error(errorCode),
                userApiMock = {
                    changePasswordOfUser: sinon.stub().callsArgWith(3, error)
                };

            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.changePasswordWithCurrentPwd(reqMock, {}, nextMock);

            // attest
            expect(nextMock.calledWith(error)).to.equal(true);
            expect(userApiMock.changePasswordOfUser.calledOnce).to.equal(true);
            expect(userApiMock.changePasswordOfUser.args[0].length).to.equal(4);
            expect(userApiMock.changePasswordOfUser.calledWith(reqMock.params.email)).to.equal(true);

            done();
        });
        it('should not change password and return error code if params are not correct', function (done) {
            // prepare
        	error = errBuilder.build(errBuilder.Errors.Generic.InvalidRequest);
        	errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
            var userApiMock = {
                changePasswordOfUser: sinon.stub().callsArgWith(3, {})
            };
            var req = {
                body: {}
            };
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.changePasswordWithCurrentPwd(req, {}, nextMock);

            // attest
            expect(nextMock.calledWith(sinon.match(errorObj))).to.equal(true);
            expect(userApiMock.changePasswordOfUser.called).to.equal(false);

            done();
        });
    });
    describe('get user setting', function() {
        it('should get user setting if request is valid and user exists', function (done) {
            // prepare
            var userApiMock = {
                getUserSetting: sinon.stub().callsArgWith(4, null, {})
            };
            reqMock.params.userId = 'me';
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.getUserSetting(reqMock, resMock, nextMock);

            // attest
            expectOkResponse();
            expect(userApiMock.getUserSetting.calledOnce).to.equal(true);
            expect(userApiMock.getUserSetting.args[0].length).to.equal(5);
            expect(userApiMock.getUserSetting.calledWith(reqMock.identity)).to.equal(true);

            done();
        });
        it('should not get user setting and return error code if something crashes', function (done) {
            // prepare
            var error = new Error(errorCode),
                userApiMock = {
                    getUserSetting: sinon.stub().callsArgWith(4, error, null)
                };
            reqMock.params.userId = 'me';
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.getUserSetting(reqMock, {}, nextMock);

            // attest
            expect(nextMock.calledWith(error)).to.equal(true);
            expect(userApiMock.getUserSetting.calledOnce).to.equal(true);
            expect(userApiMock.getUserSetting.args[0].length).to.equal(5);
            expect(userApiMock.getUserSetting.calledWith(reqMock.identity)).to.equal(true);

            done();
        });
        it('should not get user setting and return error code if params are not correct', function (done) {
            // prepare
        	error = errBuilder.build(errBuilder.Errors.Generic.InvalidRequest);
        	errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
            var userApiMock = {
                getUserSetting: sinon.stub().callsArgWith(4, {}, null)
            };
            var req = {
                params: {}
            };
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.getUserSetting(req, {}, nextMock);

            // attest
            expect(nextMock.calledWith(sinon.match(errorObj))).to.equal(true);
            expect(userApiMock.getUserSetting.called).to.equal(false);

            done();
        });
    });
    describe('get user settings', function() {
        it('should get user settings if request is valid and user exists', function (done) {
            // prepare
            var userApiMock = {
                getUserSettings: sinon.stub().callsArgWith(3, null, {})
            };
            reqMock.params.userId = 'me';
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.getUserSettings(reqMock, resMock, nextMock);

            // attest
            expectOkResponse();
            expect(userApiMock.getUserSettings.calledOnce).to.equal(true);
            expect(userApiMock.getUserSettings.args[0].length).to.equal(4);
            expect(userApiMock.getUserSettings.calledWith(reqMock.identity)).to.equal(true);

            done();
        });
        it('should not get user settings and return error code if something crashes', function (done) {
            // prepare
            var error = new Error(errorCode),
                userApiMock = {
                    getUserSettings: sinon.stub().callsArgWith(3, error, null)
                };
            reqMock.params.userId = 'me';
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.getUserSettings(reqMock, {}, nextMock);

            // attest
            expect(nextMock.calledWith(error)).to.equal(true);
            expect(userApiMock.getUserSettings.calledOnce).to.equal(true);
            expect(userApiMock.getUserSettings.args[0].length).to.equal(4);
            expect(userApiMock.getUserSettings.calledWith(reqMock.identity)).to.equal(true);

            done();
        });
        it('should not get user settings and return error code if params are not correct', function (done) {
            // prepare
        	error = errBuilder.build(errBuilder.Errors.Generic.InvalidRequest);
        	errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
            var userApiMock = {
                getUserSettings: sinon.stub().callsArgWith(3, {}, null)
            };
            var req = {
                params: {}
            };
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.getUserSettings(req, {}, nextMock);

            // attest
            expect(nextMock.calledWith(sinon.match(errorObj))).to.equal(true);
            expect(userApiMock.getUserSettings.called).to.equal(false);

            done();
        });
    });
    describe('add user settings', function() {
        it('should add user settings if request is valid and user exists', function (done) {
            // prepare
            var userApiMock = {
                addUserSettings: sinon.stub().callsArgWith(4, null, {})
            };
            reqMock.params.userId = 'me';
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.addUserSettings(reqMock, resMock, nextMock);

            // attest
            expectOkResponse();
            expect(userApiMock.addUserSettings.calledOnce).to.equal(true);
            expect(userApiMock.addUserSettings.args[0].length).to.equal(5);
            expect(userApiMock.addUserSettings.calledWith(reqMock.identity)).to.equal(true);

            done();
        });
        it('should not add user settings and return error code if something crashes', function (done) {
            // prepare
            var error = new Error(errorCode),
                userApiMock = {
                    addUserSettings: sinon.stub().callsArgWith(4, error, null)
                };
            reqMock.params.userId = 'me';
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.addUserSettings(reqMock, {}, nextMock);

            // attest
            expect(nextMock.calledWith(error)).to.equal(true);
            expect(userApiMock.addUserSettings.calledOnce).to.equal(true);
            expect(userApiMock.addUserSettings.args[0].length).to.equal(5);
            expect(userApiMock.addUserSettings.calledWith(reqMock.identity)).to.equal(true);

            done();
        });
        it('should not add user settings and return error code if params are not correct', function (done) {
            // prepare
        	error = errBuilder.build(errBuilder.Errors.Generic.InvalidRequest);
        	errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
            var userApiMock = {
                addUserSettings: sinon.stub().callsArgWith(4, {}, null)
            };
            var req = {
                params: {}
            };
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.addUserSettings(req, {}, nextMock);

            // attest
            expect(nextMock.calledWith(sinon.match(errorObj))).to.equal(true);
            expect(userApiMock.addUserSettings.called).to.equal(false);

            done();
        });
    });
    describe('update user settings', function() {
        it('should update user settings if request is valid and user exists', function (done) {
            // prepare
            var userApiMock = {
                updateUserSettings: sinon.stub().callsArgWith(5, null, {})
            };
            reqMock.params.userId = 'me';
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.updateUserSettings(reqMock, resMock, nextMock);

            // attest
            expectOkResponse();
            expect(userApiMock.updateUserSettings.calledOnce).to.equal(true);
            expect(userApiMock.updateUserSettings.args[0].length).to.equal(6);
            expect(userApiMock.updateUserSettings.calledWith(reqMock.identity)).to.equal(true);

            done();
        });
        it('should not update user settings and return error code if something crashes', function (done) {
            // prepare
            var error = new Error(errorCode),
                userApiMock = {
                    updateUserSettings: sinon.stub().callsArgWith(5, error, null)
                };
            reqMock.params.userId = 'me';
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.updateUserSettings(reqMock, {}, nextMock);

            // attest
            expect(nextMock.calledWith(error)).to.equal(true);
            expect(userApiMock.updateUserSettings.calledOnce).to.equal(true);
            expect(userApiMock.updateUserSettings.args[0].length).to.equal(6);
            expect(userApiMock.updateUserSettings.calledWith(reqMock.identity)).to.equal(true);

            done();
        });
        it('should not update user settings and return error code if params are not correct', function (done) {
            // prepare
        	error = errBuilder.build(errBuilder.Errors.Generic.InvalidRequest);
        	errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
            var userApiMock = {
                updateUserSettings: sinon.stub().callsArgWith(5, {})
            };
            var req = {
                params: {}
            };
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.updateUserSettings(req, {}, nextMock);

            // attest
            expect(nextMock.calledWith(sinon.match(errorObj))).to.equal(true);
            expect(userApiMock.updateUserSettings.called).to.equal(false);

            done();
        });
    });
    describe('delete user settings', function() {
        it('should delete user settings if request is valid and user exists', function (done) {
            // prepare
            var userApiMock = {
                deleteUserSettings: sinon.stub().callsArgWith(4, null)
            };
            reqMock.params.userId = 'me';
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.deleteUserSettings(reqMock, resMock, nextMock);

            // attest
            expectDeleteOkResponse();
            expect(userApiMock.deleteUserSettings.calledOnce).to.equal(true);
            expect(userApiMock.deleteUserSettings.args[0].length).to.equal(5);
            expect(userApiMock.deleteUserSettings.calledWith(reqMock.identity)).to.equal(true);

            done();
        });
        it('should not delete user settings and return error code if something crashes', function (done) {
            // prepare
            var error = new Error(errorCode),
                userApiMock = {
                    deleteUserSettings: sinon.stub().callsArgWith(4, error)
                };
            reqMock.params.userId = 'me';
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.deleteUserSettings(reqMock, {}, nextMock);

            // attest
            expect(nextMock.calledWith(error)).to.equal(true);
            expect(userApiMock.deleteUserSettings.calledOnce).to.equal(true);
            expect(userApiMock.deleteUserSettings.args[0].length).to.equal(5);
            expect(userApiMock.deleteUserSettings.calledWith(reqMock.identity)).to.equal(true);

            done();
        });
        it('should not delete user settings and return error code if params are not correct', function (done) {
            // prepare
        	error = errBuilder.build(errBuilder.Errors.Generic.InvalidRequest);
        	errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code };
            var userApiMock = {
                    deleteUserSettings: sinon.stub().callsArgWith(4, {})
                };
            var req = {
                params: {}
            };
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.deleteUserSettings(req, {}, nextMock);

            // attest
            expect(nextMock.calledWith(sinon.match(errorObj))).to.equal(true);
            expect(userApiMock.deleteUserSettings.called).to.equal(false);

            done();
        });
    });
    describe('activate user settings', function() {
        var options;
        beforeEach(function() {
            options = {
                tokenId: reqMock.body.token
            };
        });

        it('should activate user settings if request is valid and user exists', function (done) {
            // prepare
            var userApiMock = {
                activate: sinon.stub().callsArgWith(1, null)
            };
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.activate(reqMock, resMock, nextMock);

            // attest
            expectOkResponse();
            expect(userApiMock.activate.calledOnce).to.equal(true);
            expect(userApiMock.activate.args[0].length).to.equal(2);
            expect(userApiMock.activate.calledWith(options)).to.equal(true);

            done();
        });
        it('should not activate user settings and return error code if something crashes', function (done) {
            // prepare
            var error = new Error(errorCode),
                userApiMock = {
                    activate: sinon.stub().callsArgWith(1, error)
                };
            reqMock.params.userId = 'me';
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.activate(reqMock, {}, nextMock);

            // attest
            expect(nextMock.calledWith(error)).to.equal(true);
            expect(userApiMock.activate.calledOnce).to.equal(true);
            expect(userApiMock.activate.args[0].length).to.equal(2);
            expect(userApiMock.activate.calledWith(options)).to.equal(true);

            done();
        });
    });
    describe('reactivate user settings', function() {
        var options;
        beforeEach(function() {
            options = {
                email: reqMock.body.email,
                host: reqMock.forwardedHeaders.baseUrl
            };
        });

        it('should reactivate user settings if request is valid and user exists', function (done) {
            // prepare
            var userApiMock = {
                reactivate: sinon.stub().callsArgWith(1, null)
            };
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.reactivate(reqMock, resMock, nextMock);

            // attest
            expectOkResponse();
            expect(userApiMock.reactivate.calledOnce).to.equal(true);
            expect(userApiMock.reactivate.args[0].length).to.equal(2);
            expect(userApiMock.reactivate.calledWith(options)).to.equal(true);

            done();
        });
        it('should not reactivate user settings and return error code if something crashes', function (done) {
            // prepare
            var error = new Error(errorCode),
                userApiMock = {
                    reactivate: sinon.stub().callsArgWith(1, error)
                };
            reqMock.params.userId = 'me';
            usersHandler.__set__('users', userApiMock);

            // execute
            usersHandler.reactivate(reqMock, {}, nextMock);

            // attest
            expect(nextMock.calledWith(error)).to.equal(true);
            expect(userApiMock.reactivate.calledOnce).to.equal(true);
            expect(userApiMock.reactivate.args[0].length).to.equal(2);
            expect(userApiMock.reactivate.calledWith(options)).to.equal(true);

            done();
        });
    });
});
