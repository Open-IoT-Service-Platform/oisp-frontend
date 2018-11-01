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

describe('edit domain', function(){
    var scope,
        rootScope,
        controllerProvider,
        ctrl,
        usersServiceAPI,
        invitesServiceAPI,
        accountsServiceAPI,
        devicesServiceAPI,
        componentsServiceAPI,
        sessionServiceAPI,
        flashAPI,
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
    var ipCookieMock = {};

    beforeEach(module(function ($provide) {
        $provide.value('ipCookie', ipCookieMock)
    }));
    beforeEach(module('iotServices'));
    beforeEach(module('iotController'));

    beforeEach(inject(function($controller,
                               $rootScope,
                               usersService,
                               invitesService,
                               accountsService,
                               devicesService,
                               componentsService,
                               sessionService) {
        rootScope = $rootScope;
        scope = $rootScope.$new();
        controllerProvider = $controller;
        usersServiceAPI = usersService;
        invitesServiceAPI = invitesService;
        accountsServiceAPI = accountsService;
        devicesServiceAPI = devicesService;
        componentsServiceAPI = componentsService;
        sessionServiceAPI = sessionService;
        flashAPI = {};
        // mocking i18n resources
        rootScope.i18n = { account: {}};
        // mock current User
        scope.currentUser = {
            email: "current@user.mail",
            accounts: [{
                id: 1,
                name: "testDomainName",
                api_key: "testApiKey",
                role: "admin"
            }]
        };

        scope.users = [{},{},{}];
        scope.deviceCount = 10;
        scope.i18n = { account: { "delete_account_message": "Message"  } };

        scope.getCurrentUser = function(){

        };
        scope.$root.currentAccount = scope.currentUser.accounts[0];
    }));

    it('should edit domain name', function(){
        sinon.stub(accountsServiceAPI, 'updateAccount').callsFake(function(domainId, domain, sc){
            expect(domain.name).to.equal('New Domain Name');
            sc();
        });
        scope.selectAccount = sinon.spy();
        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $modal: {},
            usersService: usersServiceAPI,
            invitesService: invitesServiceAPI,
            accountsService: accountsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI,
            componentsService: componentsServiceAPI,
            sessionService: sessionServiceAPI
        });
        scope.accountNameEdit = true;
        scope.currentAccount.name = "New Domain Name";
        scope.updateAccount();

        expect(scope.accountNameEdit).to.equal(false);
        expect(scope.selectAccount.calledOnce).to.be.true;
    });

    it('should cancel edit domain name', function(){
        var domainServiceSpy = sinon.spy(accountsServiceAPI,
                                            'updateAccount');
        scope.selectAccount = sinon.spy();
        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $modal: {},
            usersService: usersServiceAPI,
            invitesService: invitesServiceAPI,
            accountsService: accountsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI
        });
        scope.accountNameEdit = true;
        scope.newDomainName = "New Domain Name";
        scope.init();

        expect(scope.accountNameEdit).to.equal(false);
        sinon.assert.notCalled(domainServiceSpy);
        expect(scope.selectAccount.calledOnce).to.be.true;
    });

    it('should show error on edit domain name', function(){
        sinon.stub(accountsServiceAPI, 'updateAccount').callsFake(function(domainId, domain, sc, ec){
            ec('Error');
        });
        scope.selectAccount = sinon.spy();
        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $modal: {},
            usersService: usersServiceAPI,
            invitesService: invitesServiceAPI,
            accountsService: accountsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI
        });
        scope.domainNameEdit = true;
        scope.newDomainName = "New Domain Name";
        scope.updateAccount();

        expect(scope.domainNameEdit).to.equal(true);
        expect(scope.error).not.to.be.null;
        expect(scope.selectAccount.notCalled).to.be.true;
    });

    it('should edit health time period', function(){
        sinon.stub(accountsServiceAPI, 'updateAccount').callsFake(function(domainId, domain, sc){
            expect(domain.healthTimePeriod).to.equal(172800);
            sc();
        });
        scope.selectAccount = sinon.spy();
        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $modal: {},
            usersService: usersServiceAPI,
            invitesService: invitesServiceAPI,
            accountsService: accountsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI
        });
        scope.accountNameEdit = true;
        scope.account.healthTimePeriod = 2;
        scope.updateHealthTimePeriod();

        expect(scope.account.healthTimePeriodEdit).to.equal(false);
        expect(scope.account.healthTimePeriod).to.equal(2);
        expect(scope.selectAccount.calledOnce).to.be.true;
    });
});