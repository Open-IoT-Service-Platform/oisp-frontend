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

describe('deleteAccountSpec', function(){
    var scope,
        rootScope,
        controllerProvider,
        ctrl,
        usersServiceAPI,
        invitesServiceAPI,
        accountsServiceAPI,
        devicesServiceAPI,
        loginServiceAPI,
        sessionServiceAPI = {},
        ngTableParams = function(){ this.reload=function(){};};

    var modalMock = function() {
            var self = this;
            this.open=function(config){
                return {
                    result: {
                        config: config,
                        then: function(confirm, cancel)
                        {
                            self.confirm = confirm;
                            self.cancel = cancel;
                        }
                    },
                    close: function(res){
                        if(self.confirm) {
                            self.confirm(res);
                        }
                    },
                    dismiss: function(){
                        if(self.cancel) {
                            self.cancel();
                        }
                    }
                };
            };
        },
        ipCookieMock = {},
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

    beforeEach(module(function ($provide) {
        $provide.value('ipCookie', ipCookieMock)
    }));
    beforeEach(module('iotServices'));
    beforeEach(module('iotController'));

    beforeEach(inject(function($controller, $rootScope,
                               usersService, invitesService, accountsService, devicesService, loginService, sessionService) {
        rootScope = $rootScope;
        scope = $rootScope.$new();
        controllerProvider = $controller;
        usersServiceAPI = usersService;
        invitesServiceAPI = invitesService;
        accountsServiceAPI = accountsService;
        devicesServiceAPI = devicesService;
        loginServiceAPI = loginService;
        sessionServiceAPI = sessionService;

        // mocking i18n resources
        rootScope.i18n = { account: {}};
        // mock current User
        scope.currentUser = {
            email: "current@user.mail",
            account: {
                id: 1,
                name: "testDomainName",
                api_key: "testApiKey"
            }
        };
        scope.currentAccount = scope.currentUser.account;
        scope.users = [{},{},{}];
        scope.deviceCount = 10;
        scope.i18n = { account: { "delete_account_message": "Message"  } };
        scope.getCurrentUser = function(){
            return scope.currentUser;
        };
    }));

    it('should delete the account', function(){
        sinon.stub(usersServiceAPI, 'getUsers').callsFake(function(sc){
            sc([{
                email: "admin@user.mail",
                verified: true,
                role: "admin"
            }]);
        });
        accountsServiceAPI.deleteAccount = sinon.stub().callsArgWith(1);
        devicesServiceAPI.getTotal = sinon.stub().callsArgWith(0, { state: {active: 100 }});
        loginServiceAPI.currentUser = sinon.stub().callsArgWith(0, {});
        var flash = {
            to: sinon.stub().returns({})
        };
        var winMock = { location: sinon.spy() };
        var timeout = sinon.stub().callsArgWith(0);

        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $modal: new modalMock(),
            usersService: usersServiceAPI,
            invitesService: invitesServiceAPI,
            accountsService: accountsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI,
            componentsService: {},
            sessionService: sessionServiceAPI
        });

        var modalInstance = scope.showDeleteAccount();
        var modalCtrl = controllerProvider('InviteModalCtrl', {
                $scope: scope,
                $window: winMock,
                $timeout: timeout,
                $modalInstance: modalInstance,
                currentAccount: scope.currentAccount,
                users: scope.users,
                deviceCount: scope.devicesCount,
                invitesService: invitesServiceAPI,
                accountsService: accountsServiceAPI,
                usersService: usersServiceAPI,
                loginService: loginServiceAPI,
                flash: flash
            }
        );
        scope.deleteAccount();

        expect(scope.error).to.be.undefined;
        expect(accountsServiceAPI.deleteAccount.calledOnce).to.be.true;
        expect(flash.to.calledOnce).to.be.true;
        expect(timeout.calledOnce).to.be.true;
    });

    it('should not delete the account - user cancel', function(){
        sinon.stub(usersServiceAPI, 'getUsers').callsFake(function(sc){
            sc([{
                email: "admin@user.mail",
                verified: true,
                role: "admin"
            }]);
        });
        accountsServiceAPI.deleteAccount = sinon.stub().callsArgWith(0);
        devicesServiceAPI.getTotal = sinon.stub().callsArgWith(0, {});
        loginServiceAPI.currentUser = sinon.stub().callsArgWith(0, {});
        var flash = {
            to: sinon.stub().returns({})
        };
        var winMock = { location: sinon.spy() };
        var timeout = sinon.stub().callsArgWith(0);

        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $modal: new modalMock(),
            usersService: usersServiceAPI,
            invitesService: invitesServiceAPI,
            accountsService: accountsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI,
            componentsService: {},
            sessionService: sessionServiceAPI
        });

        var modalInstance = scope.showDeleteAccount();
        var modalCtrl = controllerProvider('InviteModalCtrl', {
                $scope: scope,
                $window: winMock,
                $timeout: timeout,
                $modalInstance: modalInstance,
                currentAccount: scope.currentAccount,
                users: scope.users,
                deviceCount: scope.devicesCount,
                invitesService: invitesServiceAPI,
                accountsService: accountsServiceAPI,
                usersService: usersServiceAPI,
                loginService: loginServiceAPI,
                flash: flash
            }
        );
        scope.cancel();

        expect(scope.error).to.be.undefined;
        expect(accountsServiceAPI.deleteAccount.notCalled).to.be.true;
        expect(flash.to.notCalled).to.be.true;
        expect(timeout.notCalled).to.be.true;
    });

    it('should not delete the account - error', function(){
        sinon.stub(usersServiceAPI, 'getUsers').callsFake(function(sc){
            sc([{
                email: "admin@user.mail",
                verified: true,
                role: "admin"
            }]);
        });
        accountsServiceAPI.deleteAccount = sinon.stub().callsArgWith(2, 500, {});
        devicesServiceAPI.getTotal = sinon.stub().callsArgWith(0, {});
        var flash = {
            to: sinon.stub().returns({})
        };
        var winMock = { location: sinon.spy() };
        var timeout = sinon.stub().callsArgWith(0);

        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $modal: new modalMock(),
            usersService: usersServiceAPI,
            invitesService: invitesServiceAPI,
            accountsService: accountsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI,
            componentsService: {},
            sessionService: sessionServiceAPI
        });

        var modalInstance = scope.showDeleteAccount();
        var modalCtrl = controllerProvider('InviteModalCtrl', {
                $scope: scope,
                $window: winMock,
                $timeout: timeout,
                $modalInstance: modalInstance,
                currentAccount: scope.currentAccount,
                users: scope.users,
                deviceCount: scope.devicesCount,
                invitesService: invitesServiceAPI,
                accountsService: accountsServiceAPI,
                usersService: usersServiceAPI,
                loginService: loginServiceAPI,
                flash: flash
            }
        );
        scope.deleteAccount();

        expect(scope.error).not.to.be.undefined;
        expect(accountsServiceAPI.deleteAccount.calledOnce).to.be.true;
        expect(flash.to.calledOnce).to.be.true;
        expect(timeout.notCalled).to.be.true;
    });
});