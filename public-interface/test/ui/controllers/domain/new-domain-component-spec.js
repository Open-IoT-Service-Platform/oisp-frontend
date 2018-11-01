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

describe('newDomainComponentSpec', function(){
    var scope,
        rootScope,
        controllerProvider,
        ctrl,
        componentsServiceAPI,
        usersServiceAPI,
        accountsServiceAPI,
        devicesServiceAPI,
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
    };

    beforeEach(function(){
        module('iotServices');
        module(function($provide){
            $provide.value('ipCookie', {});
        })
    });
    beforeEach(module('iotController'));

    beforeEach(inject(function($controller, $rootScope, componentsService, usersService, accountsService, devicesService) {
        rootScope = $rootScope;
        scope = $rootScope.$new();
        controllerProvider = $controller;
        componentsServiceAPI = componentsService;
        accountsServiceAPI = accountsService;
        devicesServiceAPI = devicesService;

        usersService.getUsers = function(){
            return [{
                email: "admin@user.mail",
                verified: false,
                role: "user"
            }];
        };

        usersServiceAPI = usersService;

        // mocking i18n resources
        rootScope.i18n = { account: {}};
        scope.currentUser = { "account" : {
            domainId: 122
        }};
        sessionServiceAPI.getCurrentAccount = function(){
            return scope.currentUser.account;
        };
        sinon.stub(accountsServiceAPI, 'getActivationCode').callsFake(function(id, successCallback){
            successCallback(null, {activationCode: id});
        });

    }));

    it('Should add New Component', function(){
        sinon.stub(componentsServiceAPI, 'getFullCatalog').callsFake(function(successCallback, errorCallback){
            successCallback([]);
        });

        sinon.stub(componentsServiceAPI, 'getComponentDefinition').callsFake(function(type, successCallback, errorCallback){
            successCallback([{
                type: type
            }]);
        });

        sinon.stub(componentsServiceAPI, 'addComponent').callsFake(function(component, successCallback, errorCallback){
            successCallback(component);
        });

        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $modal: new modalMock(),
            usersService: usersServiceAPI,
            invitesService: {},
            accountsService: accountsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI,
            componentsService: componentsServiceAPI,
            sessionService: sessionServiceAPI
        });

        scope.getComponents();
        var modalInstance = scope.showComponentDetails(null, "new");

        var modalCtrl = new modalInstance.result.config.controller(
            scope,
            modalInstance,
            modalInstance.result.config.resolve.component(),
            modalInstance.result.config.resolve.newComponentCallback(),
            modalInstance.result.config.resolve.mode(),
            modalInstance.result.config.resolve.currentUser(),
            modalInstance.result.config.resolve.currentAccount(),
            componentsServiceAPI
        );

        scope.component.dimension = "test01";
        scope.component.type = "sensor";

        scope.save();

        expect(scope.components.length).to.equal(1);
        expect(scope.components[0].dimension).to.equal("test01");
        expect(scope.components[0].version).to.equal("1.0");
        expect(scope.errors.length).to.equal(0);

    });

    it('Should display errors when trying to add  a new Component returns an array of errors', function(){
        sinon.stub(componentsServiceAPI, 'getFullCatalog').callsFake(function(successCallback, errorCallback){
            successCallback([]);
        });

        sinon.stub(componentsServiceAPI, 'getComponentDefinition').callsFake(function(type, successCallback, errorCallback){
            successCallback([{
                type: type
            }]);
        });

        sinon.stub(componentsServiceAPI, 'addComponent').callsFake(function(component, successCallback, errorCallback){
            errorCallback({
                errors: ["invalid min value"]
            });
        });

        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $modal: new modalMock(),
            usersService: usersServiceAPI,
            invitesService: {},
            accountsService: accountsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI,
            componentsService: componentsServiceAPI,
            sessionService: sessionServiceAPI
        });

        scope.getComponents();
        var modalInstance = scope.showComponentDetails(null, "new");

        var modalCtrl = new modalInstance.result.config.controller(
            scope,
            modalInstance,
            modalInstance.result.config.resolve.component(),
            modalInstance.result.config.resolve.newComponentCallback(),
            modalInstance.result.config.resolve.mode(),
            modalInstance.result.config.resolve.currentUser(),
            modalInstance.result.config.resolve.currentAccount(),
            componentsServiceAPI
        );

        scope.component.dimension = "test01";
        scope.component.type = "sensor";
        scope.component.min = "some invalid min";

        scope.save();

        expect(scope.components.length).to.equal(0);
        expect(scope.errors.length).to.equal(1);

    });

    it('Should display errors when trying to add  a new Component returns a single error', function(){
        sinon.stub(componentsServiceAPI, 'getFullCatalog').callsFake(function(successCallback, errorCallback){
            successCallback([]);
        });

        sinon.stub(componentsServiceAPI, 'getComponentDefinition').callsFake(function(type, successCallback, errorCallback){
            successCallback([{
                type: type
            }]);
        });

        sinon.stub(componentsServiceAPI, 'addComponent').callsFake(function(component, successCallback, errorCallback){
            errorCallback({
                code: 1,
                message: "invalid min value"
            });
        });

        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $modal: new modalMock(),
            usersService: usersServiceAPI,
            invitesService: {},
            accountsService: accountsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI,
            componentsService: componentsServiceAPI,
            sessionService: sessionServiceAPI
        });

        scope.getComponents();
        var modalInstance = scope.showComponentDetails(null, "new");

        var modalCtrl = new modalInstance.result.config.controller(
            scope,
            modalInstance,
            modalInstance.result.config.resolve.component(),
            modalInstance.result.config.resolve.newComponentCallback(),
            modalInstance.result.config.resolve.mode(),
            modalInstance.result.config.resolve.currentUser(),
            modalInstance.result.config.resolve.currentAccount(),
            componentsServiceAPI
        );

        scope.component.dimension = "test01";
        scope.component.type = "sensor";
        scope.component.min = "some invalid min";

        scope.save();

        expect(scope.components.length).to.equal(0);
        expect(scope.errors !== []).to.be.equal(true);

    });
});