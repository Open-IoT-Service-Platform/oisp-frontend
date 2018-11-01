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

describe('listUsersSpec', function(){
    var scope,
        rootScope,
        location,
        controllerProvider,
        ctrl,
        usersServiceAPI,
        invitesServiceAPI,
        accountsServiceAPI,
        devicesServiceAPI,
        sessionServiceAPI = {},
        accountId = 1,
        ngTableParams = function(){ this.reload=function(){};};

    beforeEach(function(){
        module('iotServices');
        module(function($provide){
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
            $provide.value('ipCookie', {});
        })
    });
    beforeEach(module('iotController'));

    beforeEach(inject(function($controller, $rootScope, $location,
                               usersService, invitesService, accountsService, devicesService) {
        rootScope = $rootScope;
        scope = $rootScope.$new();
        controllerProvider = $controller;
        location = $location;
        usersServiceAPI = usersService;
        invitesServiceAPI = invitesService;
        accountsServiceAPI = accountsService;
        devicesServiceAPI = devicesService;

        // mocking i18n resources
        rootScope.i18n = { account: {}};
        // mock current Account
        scope.currentAccount = {
            id: "1",
            name: "testDomainName"
        };
        // mock current User
        scope.currentUser = {
            email: "current@user.mail",
            accounts: {
                "1": {
                    id: 1,
                    name: "testDomainName",
                    api_key: "testApiKey",
                    role: "admin"
                }
            }
        };
        sessionServiceAPI.getCurrentAccount = function(){
            return scope.currentUser.accounts["1"];
        };
    }));

    it('should change selected menu to "domains"', function(){
        sinon.stub(usersServiceAPI, 'getUsers').callsFake(function(sc){
            sc([]);
        });
        sinon.stub(invitesServiceAPI, 'getInvites').callsFake(function(accountId, sc){
            sc([]);
        });
        scope.$watch = function(a,b){b(typeof a === "string" ? scope[a] :  a())};

        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $location: {},
            $modal: {},
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

        expect(scope.users.length).to.equal(0);
        expect(rootScope.page.menuSelected).to.equal('account');
    });

    it('should show one active user and one invited', function(){
        sinon.stub(usersServiceAPI, 'getUsers').callsFake(function(sc){
            sc([{
                email: "admin@user.mail",
                verified: false,
                role: "user"
            }]);
        });
        sinon.stub(invitesServiceAPI, 'getInvites').callsFake(function(sc){
            sc(["invited@user.mail"]);
        });
        scope.$watch = function(a,b){b(typeof a === "string" ? scope[a] :  a())};

        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $location: {},
            $modal: {},
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

        expect(scope.users.length).to.equal(2);
        expect(scope.users[0].role).to.equal("user");
        expect(scope.users[1].role).to.equal("user");
    });

    it('should change the role of the user', function(){
        var userStub = {
            email: "admin@user.mail",
            verified: false,
            accounts: [{"1": "user"}]
        };
        sinon.stub(usersServiceAPI, 'getUsers').callsFake(function(sc){
            sc([userStub]);
        });
        sinon.stub(usersServiceAPI, 'updateUserAccounts').callsFake(function(user){
            userStub = user;
        });
        sinon.stub(invitesServiceAPI, 'getInvites').callsFake(function(sc){
            sc(["invited@user.mail"]);
        });
        scope.$watch = function(a,b){b(typeof a === "string" ? scope[a] :  a())};

        console.log(scope.users);
        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $location: {},
            $modal: {},
            usersService: usersServiceAPI,
            invitesService: invitesServiceAPI,
            accountsService: accountsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI,
            componentsService: {},
            sessionService: sessionServiceAPI
        });
        console.log(scope.users);
        scope.getUsers();
        scope.selectedRole = {"admin@user.mail": 'admin'};
        scope.roleChanged(userStub.email);
        scope.confirmRoleEdit(userStub);

        expect(usersServiceAPI.updateUserAccounts.callCount).to.equal(1);
        expect(userStub.accounts["1"]).to.equal('admin');
    });
});