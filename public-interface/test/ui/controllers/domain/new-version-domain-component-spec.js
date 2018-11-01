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

describe('newVersionDomainComponentSpec', function(){
    var scope,
        rootScope,
        controllerProvider,
        ctrl,
        componentsServiceAPI,
        usersServiceAPI,
        accountsServiceAPI,
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

    beforeEach(inject(function($controller, $rootScope,
                               componentsService,
                               usersService,
                               accountsService) {
        rootScope = $rootScope;
        scope = $rootScope.$new();
        controllerProvider = $controller;
        componentsServiceAPI = componentsService;
        accountsServiceAPI = accountsService;
        usersService.getUsers = function(){
            return [{
                email: "admin@user.mail",
                verified: false,
                role: "user"
            }];
        };
        scope.currentUser = { "account" : {
            id: 11
        }};
        sessionServiceAPI.getCurrentAccount = function(){
            return scope.currentUser.account;
        };
        sinon.stub(accountsServiceAPI, 'getActivationCode').callsFake(function(id, successCallback){
            successCallback(null, {activationCode: id});
        });
        usersServiceAPI = usersService;

        // mocking i18n resources
        rootScope.i18n = { account: {}};

    }));

    it('Should add New Component Version', function(){
        sinon.stub(componentsServiceAPI, 'getFullCatalog').callsFake(function(successCallback, errorCallback){
            successCallback([]);
        });

        sinon.stub(componentsServiceAPI, 'getComponentDefinition').callsFake(function(type, successCallback, errorCallback){
            successCallback([{
                type: type
            }]);
        });

        sinon.stub(componentsServiceAPI, 'editComponent').callsFake(function(id, component, successCallback, errorCallback){
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
            sessionService: sessionServiceAPI
        });

        scope.getComponents();

        var component = {
            dimension: "test02",
            type: "sensor"
        };

        var modalInstance = scope.showComponentDetails(component, "view");

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

        scope.newVersion();
        scope.component.measureunit = "measure02";

        scope.save();

        expect(scope.components[0].measureunit).to.equal("measure02");
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

        sinon.stub(componentsServiceAPI, 'editComponent').callsFake(function(id, component, successCallback, errorCallback){
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
            sessionService: sessionServiceAPI
        });

        scope.getComponents();

        var component = {
            dimension: "test02",
            type: "sensor"
        };

        var modalInstance = scope.showComponentDetails(component, "view");

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

        scope.newVersion();
        scope.component.measureunit = "measure02";

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

        sinon.stub(componentsServiceAPI, 'editComponent').callsFake(function(id, component, successCallback, errorCallback){
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
            sessionService: sessionServiceAPI
        });

        scope.getComponents();

        var component = {
            dimension: "test02",
            type: "sensor"
        };

        var modalInstance = scope.showComponentDetails(component, "view");

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

        scope.newVersion();
        scope.component.measureunit = "measure02";

        scope.save();

        expect(scope.components.length).to.equal(0);
        expect(scope.errors.length).to.equal(1);

    });
});