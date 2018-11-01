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

describe('listComponentsSpec', function(){
    var scope,
        rootScope,
        location,
        controllerProvider,
        ctrl,
        usersServiceAPI,
        invitesServiceAPI,
        accountsServiceAPI,
        devicesServiceAPI,
        componentsServiceAPI,
        sessionServiceAPI = {},
        ngTableParams = function(){ this.reload=function(){};};

    var modalMock = function() {
        var self = this;
        this.open=function(config){
            return {
                result: {
                    config: config
                },
                close: sinon.spy()
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

    beforeEach(inject(function($controller, $rootScope, $location,
                               usersService, invitesService, accountsService, componentsService, devicesService) {
        rootScope = $rootScope;
        scope = $rootScope.$new();
        controllerProvider = $controller;
        location = $location;
        usersServiceAPI = usersService;
        invitesServiceAPI = invitesService;
        accountsServiceAPI = accountsService;
        devicesServiceAPI = devicesService;
        componentsServiceAPI = componentsService;

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
        sessionServiceAPI.getCurrentAccount = function(){
            return scope.currentUser.account;
        };
        sinon.stub(accountsServiceAPI, 'getActivationCode').callsFake(function(id, successCallback){
            successCallback(null, {activationCode: id});
        });
    }));

    it('should list current components - default grouping', function(){
        componentsServiceAPI.getFullCatalog = sinon.stub().callsArgWith(0, [
            {
                dimension: "sensorOne",
                version: "1.0",
                type: "sensor"
            },
            {
                dimension: "sensorTwo",
                version: "2.0",
                type: "sensor"
            },
            {
                dimension: "actuatorOne",
                version: "1.0",
                type: "actuator"
            }
        ]);
        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $location: {},
            $modal: {},
            usersService: usersServiceAPI,
            invitesService: {},
            accountsService: accountsServiceAPI,
            componentsService: componentsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI,
            sessionService: sessionServiceAPI
        });
        // Open components tag
        scope.getComponents();

        expect(scope.components.length).to.equal(3);
        expect(Object.keys(scope.componentsGroups).length).to.equal(3);
        expect(scope.groupedBy).to.equal('dimension');
    });

    it('should list current components - group by type', function(){
        componentsServiceAPI.getFullCatalog = sinon.stub().callsArgWith(0, [
            {
                dimension: "sensorOne",
                version: "1.0",
                type: "sensor"
            },
            {
                dimension: "sensorTwo",
                version: "2.0",
                type: "sensor"
            },
            {
                dimension: "actuatorOne",
                version: "1.0",
                type: "actuator"
            }
        ]);
        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $location: {},
            $modal: {},
            usersService: usersServiceAPI,
            invitesService: {},
            accountsService: accountsServiceAPI,
            componentsService: componentsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI,
            sessionService: sessionServiceAPI
        });
        // Open components tag
        scope.groupedBy = 'type';
        scope.getComponents();

        expect(scope.components.length).to.equal(3);
        expect(Object.keys(scope.componentsGroups).length).to.equal(2);
        expect(scope.groupedBy).to.equal('type');
        expect(scope.componentsGroups.sensor.length).to.equal(2);
        expect(scope.componentsGroups.actuator.length).to.equal(1);
        var ev = {
            preventDefault: sinon.spy(),
            stopPropagation: sinon.spy()
        };
        scope.expandAll(true, ev);
        expect(scope.isOpen[0]).to.equal(true);
        scope.expandAll(false, ev);
        expect(scope.isOpen[0]).to.equal(false);
        expect(ev.preventDefault.calledTwice).to.equal(true);
        expect(ev.stopPropagation.calledTwice).to.equal(true);
    });

    it('should show component details', function(){
        componentsServiceAPI.getComponentDefinition = sinon.stub().callsArgWith(1, {});

        ctrl = controllerProvider('AccountCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $modal: new modalMock(),
            usersService: usersServiceAPI,
            invitesService: {},
            accountsService: accountsServiceAPI,
            componentsService: componentsServiceAPI,
            $filter: {},
            ngTableParams: ngTableParams,
            devicesService: devicesServiceAPI,
            sessionService: sessionServiceAPI
        });

        var modalInstance = scope.showComponentDetails({});
        var modalCtrl = new modalInstance.result.config.controller(
            scope, modalInstance, {}, componentsServiceAPI
        );
        scope.close();

        expect(modalInstance.close.calledOnce).to.be.true;
    });

});