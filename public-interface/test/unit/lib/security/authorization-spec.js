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
    auth = rewire('../../../../lib/security/authorization'),
    secConfig = rewire('../../../../lib/security/config'),
    keyPem = require('../../../../lib/security/key-pem'),
    request = require('supertest'),
    uuid = require('uuid'),
    path = require('path'),
    errBuilder = require("../../../../lib/errorHandler").errBuilder,
    rolesConfig = {
        admin : [
            "public",
            "write"],
        user : [
            "public"],
        anon : [
            "public"
        ]
    },
    routesConfig;


describe('Security Authorization Module', function() {

    describe('Authorization token generation', function(){

        var generator,
            req,
            res,
            accountId,
            userMock,
            respSend;

        beforeEach(function() {

            accountId = uuid.v4();
            routesConfig = [
                [ "/api/accounts/" + accountId + "/restricted",         "GET",     "write"        ],
                [ "/api/public",                        "GET",     "public"       ]
            ];

            //those are test keys only
            secConfig.private_pem_path =  path.join(__dirname, 'config/test_private.pem');
            secConfig.public_pem_path = path.join(__dirname, 'config/test_public.pem');
            keyPem.init(secConfig);

            req = {
                user : {
                    id : "1",
                    accounts : {
                    },
                    role : "admin"
                }
            };

            userMock = {
                getUser: sinon.stub().callsArgWith(1, null, req.user)
            };
            respSend = {
                send: sinon.spy()
            };
            res = {
                status: sinon.stub().returns(respSend)
            };
            req.user.accounts[accountId] = "admin";
            generator = auth.getAuthToken({followRedirect:false});

            auth.__set__('rolesConfig', rolesConfig);
            auth.__set__('defaultTokenExpire', secConfig.default_token_expire);
            auth.__set__('iss', secConfig.iss);
            auth.__set__('alg', secConfig.alg);
            auth.__set__('keyPem', keyPem);
            auth.__set__('User', userMock);
        });

        it('should generate a new token', function(done){
            //prepare

            //execute
            generator(req, res);

            //attest
            expect(res.status.calledWith(200));
            expect(respSend.send.args[0][0].token).to.be.a('string');

            done();
        });

        it('should not get auth token if user is unauthorized', function(done){
            //prepare
            req = {};

            //execute
            generator(req, res);
            //attest
            expect(respSend.send.calledOnce).to.equal(true);
            expect(res.status.args[0][0]).to.equal(401);

            done();
        });

        it('should allow access to a public resource', function(done){
            //prepare
            generator(req, res);
            var token = respSend.send.args[0][0].token;

            secConfig.roles = rolesConfig;
            secConfig.routes = routesConfig;

            var expressApp = auth.middleware(secConfig);
            expressApp.get('/api/public', function(req, res){
                res.status(201).send();
            });

            //execute and attest
            request(expressApp)
                .get('/api/public')
                .set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + token)
                .expect(201, done);
        });

        it('should allow access to a restricted resource when proper permissions', function(done){
            //prepare

            generator(req, res);
            var token = respSend.send.args[0][0].token;

            secConfig.roles = rolesConfig;
            secConfig.routes = routesConfig;

            var expressApp = auth.middleware(secConfig);

            expressApp.get('/api/accounts/' + accountId + '/restricted', function(req, res){
                res.status(201).send();
            });

            //execute and attest
            request(expressApp)
                .get('/api/accounts/' + accountId + '/restricted')
                .set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + token)
                .expect(201, done);
        });

        it('should restrict access to a restricted resource when not enough permissions', function(done){
            //prepare
            generator(req, res);
            var token = respSend.send.args[0][0].token;

            secConfig.roles = rolesConfig;
            secConfig.routes = routesConfig;

            var expressApp = auth.middleware(secConfig);

            expressApp.get('/api/restricted', function(req, res){
                respSend(201);
            });

            //execute and attest
            request(expressApp)
                .get('/api/restricted')
                .set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + token)
                .expect(401, done);
        });

        it('should not get auth token if problem while generating token happened', function(done){
            //prepare
            var error = errBuilder.Errors.Generic.InternalServerError,
                next = sinon.spy(),
                generateTokenMock = sinon.stub().callsArgWith(4, error, null);
            auth.__set__('generateToken', generateTokenMock);

            //execute
            var generator = auth.getAuthToken({followRedirect:false});
            generator(req, res, next);
            //attest
            expect(next.calledOnce).to.equal(true);
            expect(next.calledWith(error)).to.equal(true);

            done();
        });

        it('should not get token info when token is expired', function(done){
            //prepare
            var callback = sinon.spy(),
                jsjwsMock = {
                    JWS: function(){
                        return {
                            verifyJWSByKey: function() {
                                return true;
                            },
                            getParsedHeader: function() {
                                return "header";
                            },
                            getParsedPayload: function() {
                                return {
                                    exp: new Date(1000)
                                };
                            }
                        };
                    }
                };
            auth.__set__('jsjws', jsjwsMock);

            //execute
            auth.tokenInfo("token", {}, callback);

            //attest
            expect(callback.calledOnce).to.equal(true);

            done();
        });

        it('should not get token info when token not found', function(done){
            //prepare
            var callback = sinon.spy(),
                jsjwsMock = {
                    JWS: function(){
                        return {
                            verifyJWSByKey: function() {
                                return true;
                            },
                            getParsedHeader: function() {
                                return "header";
                            },
                            getParsedPayload: function() {
                                return {
                                    exp: Date.now() + 1000,
                                    jti: "jti"
                                };
                            }
                        };
                    }
                };
            auth.__set__('jsjws', jsjwsMock);
            //execute
            auth.tokenInfo("token", {}, callback);

            //attest
            expect(callback.calledOnce).to.equal(true);

            done();
        });

        it('should not get token info when exception is encountered', function(done){
            //prepare
            var callback = sinon.spy(),
                jsjwsMock = {
                    JWS: function(){
                        return {
                            verifyJWSByKey: function() {
                                throw 500;
                            }
                        };
                    }
                };
            auth.__set__('jsjws', jsjwsMock);

            //execute
            auth.tokenInfo("token", {}, callback);

            //attest
            expect(callback.calledOnce).to.equal(true);

            done();
        });

        it('should get token info when req body is incorrect', function(done){
            //prepare
            var token = {
                    accounts: [],
                    role: 'admin'
                },
                callback = sinon.spy(),
                jsjwsMock = {
                    JWS: function(){
                        return {
                            verifyJWSByKey: function() {
                                return true;
                            },
                            getParsedHeader: function() {
                                return "header";
                            },
                            getParsedPayload: function() {
                                return {
                                    exp: Date.now() + 1000,
                                    jti: "jti"
                                };
                            }
                        };
                    }
                };

            auth.__set__('jsjws', jsjwsMock);

            //execute
            auth.tokenInfo("token", null, callback);

            //attest
            expect(callback.calledOnce).to.equal(true);
            expect(typeof(callback.getCall(0).args)).to.equal(typeof({}));

            done();
        });

        it('should get token info when req is an object and token accounts not found', function(done){
            //prepare
            var token = {
                    role: 'admin'
                },
                req = {},
                callback = sinon.spy(),
                jsjwsMock = {
                    JWS: function(){
                        return {
                            verifyJWSByKey: function() {
                                return true;
                            },
                            getParsedHeader: function() {
                                return "header";
                            },
                            getParsedPayload: function() {
                                return {
                                    exp: Date.now() + 1000,
                                    jti: "jti"
                                };
                            }
                        };
                    }
                };
            auth.__set__('jsjws', jsjwsMock);
            //execute
            auth.tokenInfo("token", req, callback);

            //attest
            expect(callback.calledOnce).to.equal(true);
            expect(typeof(callback.getCall(0).args)).to.equal(typeof({}));

            done();
        });

        it('should get token info when device token found', function(done){
            //prepare
            var token = {
                    role: 'admin',
                    accounts: {
                        "acc001": 'device'
                    }
                },
                req = {},
                callback = sinon.spy(),
                jsjwsMock = {
                    JWS: function(){
                        return {
                            verifyJWSByKey: function() {
                                return true;
                            },
                            getParsedHeader: function() {
                                return "header";
                            },
                            getParsedPayload: function() {
                                return {
                                    exp: Date.now() + 1000,
                                    jti: "jti"
                                };
                            }
                        };
                    }
                };
            auth.__set__('jsjws', jsjwsMock);

            //execute
            auth.tokenInfo("token", req, callback);

            //attest
            expect(callback.calledOnce).to.equal(true);
            expect(typeof(callback.getCall(0).args)).to.equal(typeof({}));

            done();
        });

        it('should get token info if error in database is encountered while account finding', function(done){
            //prepare
            var req = {},
                callback = sinon.spy(),
                jsjwsMock = {
                    JWS: function(){
                        return {
                            verifyJWSByKey: function() {
                                return true;
                            },
                            getParsedHeader: function() {
                                return "header";
                            },
                            getParsedPayload: function() {
                                return {
                                    exp: Date.now() + 1000,
                                    jti: "jti"
                                };
                            }
                        };
                    }
                };
            auth.__set__('jsjws', jsjwsMock);

            //execute
            auth.tokenInfo("token", req, callback);

            //attest
            expect(callback.calledOnce).to.equal(true);

            done();
        });
    });

    describe('isAdminForAccountInUri', function() {
        it('should get false if user is not an admin', function (done) {
            //prepare
            var req = {
                    headers: {
                        authorization: "authorization"
                    }
                },
                userId = uuid.v4(),
                tokenInfo = {
                    payload: {
                        sub: userId
                    }
                },
                utilsMock = {
                    getBearerToken: sinon.stub().returns("token")
                },
                getTokenInfoMock = sinon.stub().callsArgWith(2, tokenInfo),
                callback = sinon.spy();

            auth.__set__('getTokenInfo', getTokenInfoMock);
            auth.__set__('utils', utilsMock);

            //execute
            auth.isAdminForAccountInUri(req, userId, callback);

            //attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.calledWith(false)).to.equal(true);

            done();
        });

        it('should get true if user is an admin', function (done) {
            //prepare
            var req = {
                    headers: {
                        authorization: "authorization"
                    }
                },
                userId = uuid.v4(),
                tokenInfo = {
                    payload: {
                        sub: userId,
                        accounts: [{}]
                    }
                },
                utilsMock = {
                    getBearerToken: sinon.stub().returns("token")
                },
                getTokenInfoMock = sinon.stub().callsArgWith(2, tokenInfo),
                getAccountRoleMock = sinon.stub().returns('admin'),
                callback = sinon.spy();

            auth.__set__('getTokenInfo', getTokenInfoMock);
            auth.__set__('getAccountRole', getAccountRoleMock);
            auth.__set__('utils', utilsMock);

            //execute
            auth.isAdminForAccountInUri(req, userId, callback);

            //attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.calledWith(true)).to.equal(true);

            done();
        });

        it('should get true with extra response if user is an admin', function (done) {
            //prepare
            var req = {
                    headers: {
                        authorization: "authorization"
                    }
                },
                userId = uuid.v4(),
                tokenInfo = {
                    payload: {
                        sub: userId
                    },
                    accounts: []
                },
                utilsMock = {
                    getBearerToken: sinon.stub().returns("token")
                },
                getTokenInfoMock = sinon.stub().callsArgWith(2, tokenInfo),
                getAccountRoleMock = sinon.stub().returns('admin'),
                callback = sinon.spy(),
                accountIdRexMock = {
                    exec: sinon.stub().returns(["item1", "item2"])
                };

            auth.__set__('getTokenInfo', getTokenInfoMock);
            auth.__set__('getAccountRole', getAccountRoleMock);
            auth.__set__('utils', utilsMock);
            auth.__set__('accountIdRex', accountIdRexMock);

            //execute
            auth.isAdminForAccountInUri(req, userId, callback);

            //attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.getCall(0).args[2]).to.equal("item2");

            done();
        });
    });

    describe('deleteAuthToken', function() {
        it('should not delete auth token if req body is incorrect', function (done) {
            //prepare
            var req = {},
                resSend = {
                    send: sinon.spy()
                },
                res = {
                    status: sinon.stub().returns(resSend)
                };

            //execute
            auth.deleteAuthToken(req, res);

            //attest
            expect(resSend.send.calledOnce).to.equal(true);
            expect(res.status.calledWith(401)).to.equal(true);

            done();
        });
    });
});
