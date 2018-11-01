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

describe('inviteUserSpec', function(){
    var scope,
        rootScope,
        controllerProvider,
        ctrl,
        usersServiceAPI,
        invitesServiceAPI,
        accountsServiceAPI,
        devicesServiceAPI,
        sessionServiceAPI,
        loginServiceAPI,
        recaptchaServiceAPI,
        accountId = "123",
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
    };

    var flash = {
        to: sinon.stub().returns(0, function(){})
    };

    var ipCookieMock = {};

    var vcRecaptchaServiceMock = {
        data: function() {
            var data = {
                response: 's09ef48213s8fe8fw8rwer5489wr8wd5',
                challenge: '1234567890'
            };
            return data;
        },
        reload: function() {}
    };

    beforeEach(module(function ($provide) {
        var sessionServiceMock = {
            url: '',
            then : function(callback){
                callback(this.url)
            },
            addAccountIdPrefix : function(url){
                this.url = '/accounts/' + accountId + url;
                return this;
            }
        };
        $provide.value('sessionService', sessionServiceMock);
        $provide.value('ipCookie', ipCookieMock)
    }));
    beforeEach(module(function ($provide) {
        $provide.value('vcRecaptchaService', vcRecaptchaServiceMock)
    }));
    beforeEach(module('iotServices'));
    beforeEach(module('iotController'));

    beforeEach(inject(function($controller, $rootScope, 
                               usersService, invitesService, accountsService, devicesService, sessionService) {
        rootScope = $rootScope;
        scope = $rootScope.$new();
        controllerProvider = $controller;
        usersServiceAPI = usersService;
        invitesServiceAPI = invitesService;
        accountsServiceAPI = accountsService;
        devicesServiceAPI = devicesService;
        sessionServiceAPI = sessionService;
        accountId = "123";

        sessionServiceAPI.setCurrentAccount({ id: accountId, healthTimePeriod: 10 });

        // mocking i18n resources
        rootScope.i18n = { account: {}};
        // mock current User
        scope.currentUser = {
            email: "current@user.mail",
            accounts: {
                "123": {
                    id: accountId,
                    name: "testDomainName",
                    api_key: "testApiKey",
                    role: "admin"
                }
            }
        };
        scope.users = [{},{},{}];
        scope.deviceCount = 10;
        scope.i18n = { account: { "delete_account_message": "Message"  } };
        scope.getCurrentUser = function(){
            return scope.currentUser;
        };

        sinon.stub(accountsServiceAPI, 'getActivationCode').callsFake(function(id, successCallback){
            successCallback(null, {activationCode: id});
        });
    }));

    it('should invite a user', function(){
        sinon.stub(usersServiceAPI, 'getUsers').callsFake(function(sc){
            sc([{
                email: "admin@user.mail",
                verified: false,
                role: "admin"
            }]);
        });
        var invited = [];

        sinon.stub(invitesServiceAPI, 'getInvites').callsFake(function(sc){
            sc(invited);
        });
        sinon.stub(invitesServiceAPI, 'addInvite').callsFake(function(newInvite, sc){
            invited.push(newInvite.email);
            sc();
    });

        scope.$watch = function(a,b){b(typeof a === "string" ? scope[a] :  a())};
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
        scope.getUsers();

        expect(scope.users.length).to.equal(1);
        expect(scope.users[0].role).to.equal("user");

        var modalInstance = scope.addUser();
        var modalCtrl = controllerProvider('InviteModalCtrl', {
                $scope: scope,
                $window: {},
                $timeout: {},
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
        scope.toInvite.email = "invite@user.mail";
        scope.add();

        expect(scope.users.length).to.equal(2);
        expect(scope.users[0].role).to.equal("user");
        expect(scope.users[1].role).to.equal("user");
        expect(scope.error).to.be.null;
    });

    it('should return a conflict', function(){
         sinon.stub(usersServiceAPI, 'getUsers').callsFake(function(sc){
             sc([{
                 email: "admin@user.mail",
                 verified: false,
                 role: "user"
             }]);
         });
        var invited = [];
        sinon.stub(invitesServiceAPI, 'getInvites').callsFake(function(sc){
            sc(invited);
        });
        sinon.stub(invitesServiceAPI, 'addInvite').callsFake(function(newInvite, sc, ec){
            ec(null, 409);
        });

        scope.$watch = function(a,b){b(typeof a === "string" ? scope[a] :  a())};
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
        scope.getUsers();
        expect(scope.users.length).to.equal(1);
        expect(scope.users[0].role).to.equal("user");

        var modalInstance = scope.addUser();
        var modalCtrl = controllerProvider('InviteModalCtrl', {
                $scope: scope,
                $window: {},
                $timeout: {},
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
        scope.toInvite.email = "invite@user.mail";
        scope.add();

        expect(scope.users.length).to.equal(1);
        expect(scope.users[0].role).to.equal("user");
        expect(scope.error).not.to.be.null;
    });

    it('should cancel modal dialog', function(){
        sinon.stub(usersServiceAPI, 'getUsers').callsFake(function(sc){
            sc([{
                email: "admin@user.mail",
                verified: false,
                role: "user"
            }]);
        });
        var invited = [];
        sinon.stub(invitesServiceAPI, 'getInvites').callsFake(function(sc){
            sc(invited);
        });
        var addInviteSpy = sinon.stub(invitesServiceAPI,
            'addInvite');

        scope.$watch = function(a,b){b(typeof a === "string" ? scope[a] :  a())};
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
        scope.getUsers();

        expect(scope.users.length).to.equal(1);
        expect(scope.users[0].role).to.equal("user");

        var modalInstance = scope.addUser();
        var modalCtrl = controllerProvider('InviteModalCtrl', {
                $scope: scope,
                $window: {},
                $timeout: {},
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

        expect(scope.users.length).to.equal(1);
        expect(scope.users[0].role).to.equal("user");
        expect(scope.error).to.be.undefined;
        sinon.assert.notCalled(addInviteSpy);
    });
});