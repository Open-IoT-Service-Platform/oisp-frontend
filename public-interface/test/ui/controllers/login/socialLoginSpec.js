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

describe('socialLoginSpec', function(){
    var scope,
        rootScope,
        window,
        controllerProvider,
        ctrl,
        accountsServiceAPI,
        usersServiceAPI,
        loginServiceAPI,
        sessionServiceMock,
        vcRecaptchaServiceMock;

    beforeEach(module(function ($provide) {
        vcRecaptchaServiceMock = {
            data: function() {
                var data = {
                    response: 's09ef48213s8fe8fw8rwer5489wr8wd5',
                    challenge: '1234567890'
                };
                return data;
            },
            reload: sinon.spy()
        };
        $provide.value('vcRecaptchaService', vcRecaptchaServiceMock)
    }));
    beforeEach(module('iotServices'));
    beforeEach(function(){
        module('iotServices');
        module(function($provide){
            $provide.value('ipCookie', {});
        });
    });
    beforeEach(module('iotController'));

    beforeEach(inject(function($controller, $rootScope, $window,
                               accountsService, usersService, loginService) {
        rootScope = $rootScope;
        window = $window;
        scope = $rootScope.$new();
        controllerProvider = $controller;
        accountsServiceAPI = accountsService;
        usersServiceAPI = usersService;
        loginServiceAPI = loginService;

        sessionServiceMock = {
            getJwt: sinon.spy(),
            setJwt: sinon.spy(),
            clearJwt: sinon.spy(),
            setRefreshJwt: sinon.spy(),
            getRefreshJwt: sinon.spy(),
            clearRefreshJwt: sinon.spy(),
        };
        // mocking i18n resources
        rootScope.i18n = { };

    }));

    it('should receive social jwt token and redirect to dashboard', function(){
        loginServiceAPI.login = sinon.spy();
        usersServiceAPI.addUser = sinon.spy();
        usersServiceAPI.deleteUser = sinon.spy();
        accountsServiceAPI.addAccount = sinon.spy();
        loginServiceAPI.refreshToken = sinon.spy();
        loginServiceAPI.currentUser = sinon.stub().callsArgWith(0, {
            email: 'test@user',
            role: 'user',
            verified: true,
            termsAndConditions: true
        });
        var window = {};
        ctrl = controllerProvider('LoginCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $window: window,
            $routeParams: {
                jwt: 'jwtToken',
            },
            ngResourceBundle: {},
            accountsService: accountsServiceAPI,
            usersService: usersServiceAPI,
            loginService: loginServiceAPI,
            sessionService: sessionServiceMock
        });

        expect(sessionServiceMock.setJwt.calledOnce).to.be.equal(true);
        expect(window.location).to.equal("/ui/auth#/validate");

        expect(accountsServiceAPI.addAccount.notCalled).to.be.equal(true);
        expect(loginServiceAPI.login.notCalled).to.be.equal(true);
        expect(loginServiceAPI.refreshToken.notCalled).to.be.equal(true);
        expect(loginServiceAPI.currentUser.calledOnce).to.be.equal(true);
        expect(usersServiceAPI.addUser.notCalled).to.be.equal(true);
        expect(usersServiceAPI.deleteUser.notCalled).to.be.equal(true);
    });
});
