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

describe('localLoginSpec', function(){
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

        // mocking i18n resources
        rootScope.i18n = { auth: { invalid_username_password: {} }};

    }));

    beforeEach(function () {
        sessionServiceMock = {
            getJwt: sinon.spy(),
            setJwt: sinon.spy(),
            clearJwt: sinon.spy(),
            setRefreshJwt: sinon.spy(),
            getRefreshJwt: sinon.spy(),
            clearRefreshJwt: sinon.spy()
        };
    });

    it('should not login and display an error (user did not validate her info yet)', function(){
        if(getServicesConfig('validateUserEmail')) {
            loginServiceAPI.login = sinon.stub().callsArgWith(1, {
                token: "test Token"
            });
            var window = {};
            ctrl = controllerProvider('LoginCtrl', {
                $scope: scope,
                $rootScope: rootScope,
                $window: window,
                $routeParams: {},
                ngResourceBundle: {},
                accountsService: accountsServiceAPI,
                usersService: usersServiceAPI,
                loginService: loginServiceAPI,
                sessionService: sessionServiceMock
            });
            scope.email = 'test@user';
            scope.password = 'TestPwd';
            loginServiceAPI.currentUser = sinon.stub().callsArgWith(0, {
                email: 'test@user',
                role: 'guest',
                verified: false
            });
            scope.login();

            expect(sessionServiceMock.setJwt.calledOnce).to.be.equal(true);
            expect(sessionServiceMock.setRefreshJwt.calledOnce).to.be.equal(true);
            expect(scope.error).to.equal('Invalid username or password.');
        }
    });

    it('should login and redirect to Dashboard', function(){
        loginServiceAPI.login = sinon.stub().callsArgWith(1,{
            token: "test Token"
        });
        var window = {};
        ctrl = controllerProvider('LoginCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $window: window,
            $routeParams: {},
            ngResourceBundle: {},
            accountsService: accountsServiceAPI,
            usersService: usersServiceAPI,
            loginService: loginServiceAPI,
            sessionService: sessionServiceMock
        });
        scope.email = 'test@user';
        scope.password = 'TestPwd';
        loginServiceAPI.currentUser = sinon.stub().callsArgWith(0, {
            email: 'test@user',
            role: 'user',
            verified: true,
            termsAndConditions: true
        });

        scope.login();

        expect(sessionServiceMock.setJwt.calledOnce).to.be.equal(true);
        expect(sessionServiceMock.setRefreshJwt.calledOnce).to.be.equal(true);
        expect(window.location).to.equal("/ui/dashboard");
    });

    it('should show login error', function(){
        loginServiceAPI.login = sinon.stub().callsArgWith(2);
        var window = {};
        ctrl = controllerProvider('LoginCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $window: window,
            $routeParams: {},
            ngResourceBundle: {},
            accountsService: accountsServiceAPI,
            usersService: usersServiceAPI,
            loginService: loginServiceAPI,
            sessionService: sessionServiceMock
        });
        expect(scope.error).to.be.equal(undefined);
        scope.login();

        expect(scope.error).not.to.be.equal(undefined);
        expect(sessionServiceMock.setJwt.notCalled).to.be.equal(true);
        expect(sessionServiceMock.setRefreshJwt.notCalled).to.be.equal(true);
        expect(window.location).to.equal(undefined);
    });

    it('should logout and clean sessionStorage', function(){
        loginServiceAPI.login = sinon.stub().callsArgWith(1,{
            token: "test Token"
        });
        loginServiceAPI.logout = sinon.stub().callsArgWith(0, {});
        var window = {};
        controllerProvider('LoginCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $window: window,
            $routeParams: {},
            ngResourceBundle: {},
            accountsService: accountsServiceAPI,
            usersService: usersServiceAPI,
            loginService: loginServiceAPI,
            sessionService: sessionServiceMock
        });
        scope.email = 'test@user';
        scope.password = 'TestPwd';
        loginServiceAPI.currentUser = sinon.stub().callsArgWith(0, {
            email: 'test@user',
            role: 'user',
            verified: true,
            termsAndConditions: true
        });
        scope.login();

        expect(sessionServiceMock.setJwt.calledOnce).to.be.equal(true);
        expect(sessionServiceMock.setRefreshJwt.calledOnce).to.be.equal(true);
        expect(window.location).to.equal("/ui/dashboard");

        controllerProvider('LogoutCtrl', {
            $window: window,
            loginService: loginServiceAPI,
            sessionService: sessionServiceMock
        });

        expect(sessionServiceMock.clearJwt.calledOnce).to.be.equal(true);
        expect(sessionServiceMock.clearRefreshJwt.calledOnce).to.be.equal(true);
        expect(window.location).to.equal("/");
    });
});
