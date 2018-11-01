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

describe('AddEditDeviceCtrlSpec', function(){
    var scope,
        rootScope,
        location,
        controllerProvider,
        ctrl,
        devicesServiceAPI,
        sessionServiceAPI;
    var ipCookieMock = {};

    beforeEach(module(function ($provide) {
        $provide.value('ipCookie', ipCookieMock)
    }));
    beforeEach(module('iotServices'));
    beforeEach(module('iotController'));

    beforeEach(inject(function($controller, $rootScope, $location, devicesService, sessionService) {
        rootScope = $rootScope;
        scope = $rootScope.$new();
        controllerProvider = $controller;
        location = $location;
        devicesServiceAPI = devicesService;
        sessionServiceAPI = sessionService;

        sessionServiceAPI.setCurrentAccount({ id: 123 });
        // mocking i18n resources
        rootScope.i18n = { device: {}};
    }));

    it('should change selected menu to "devices"', function(){
       var devicesServiceStub = sinon.stub(devicesServiceAPI);
        ctrl = controllerProvider('AddEditDeviceCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $location: {},
            $filter:{},
            $routeParams:{},
            $modal: {},
            devicesService: devicesServiceStub,
            sessionService: sessionServiceAPI
        });

        expect(rootScope.page.menuSelected).to.equal('devices');
    });

    it('should change "tags" model when loading', function(){

        var stub = sinon.stub(devicesServiceAPI, "getTags").callsFake(function(sc, ec){
            sc(['t1']);
        });
        scope.$watch = function(a,b){b(a())};

        ctrl = controllerProvider('AddEditDeviceCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $location: {},
            $filter:{},
            $routeParams:{},
            $modal: {},
            devicesService: devicesServiceAPI,
            sessionService: sessionServiceAPI
        });
        expect(scope.tags.length).to.equal(1);
        expect(stub.callCount).to.equal(1);
    });

    it('should save device and change path when clicking save button', function(){

        var did = Math.random(),
            saveStub = sinon.stub(devicesServiceAPI, 'addDevice').callsFake(function(device, sc, ec){
                expect(device.id).to.equal(did);
                sc(device);
            }),
            updateStub = sinon.stub(devicesServiceAPI, 'updateDevice');

        ctrl = controllerProvider('AddEditDeviceCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $location: location,
            $filter:{},
            $routeParams:{},
            $modal: {},
            devicesService: devicesServiceAPI,
            sessionService: {}
        });

        scope.device = {id: did};
        scope.saveDevice();

        expect(location.path()).to.contain('/devices');
        expect(saveStub.callCount).to.equal(1);
        expect(updateStub.callCount).to.equal(0);
    });

    it('should update device and change path when clicking save button', function(){

        var did = Math.random(),
            getStub = sinon.stub(devicesServiceAPI, 'getDevice').callsFake(function(deviceId, sc, ec){
                expect(deviceId).to.equal(did);
                sc({id: deviceId, status: 'ready'});
            }),
            saveStub = sinon.stub(devicesServiceAPI, 'addDevice'),
            updateStub = sinon.stub(devicesServiceAPI, 'updateDevice').callsFake(function(device, sc, ec){
                expect(device.id).to.equal(did);
                sc(device);
            });

        scope.$watch = function(a,b){b(a())};
        ctrl = controllerProvider('AddEditDeviceCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $location: location,
            $filter:{},
            $routeParams:{ deviceId: did},
            $modal: {},
            devicesService: devicesServiceAPI,
            sessionService: sessionServiceAPI
        });

        scope.saveDevice();

        expect(location.path()).to.contain('/devices');
        expect(getStub.callCount).to.equal(1);
        expect(updateStub.callCount).to.equal(1);
        expect(saveStub.callCount).to.equal(0);
        expect(scope.device.status).to.equal('ready');
    });

    it('should change path when clicking cancel button', function(){

        ctrl = controllerProvider('AddEditDeviceCtrl', {
            $scope: scope,
            $rootScope: rootScope,
            $location: location,
            $filter:{},
            $routeParams:{},
            $modal: {},
            devicesService: devicesServiceAPI,
            sessionService: {}
        });

        location.path('/undefined');
        expect(location.path()).to.contain('/undefined');

        scope.cancel();
        expect(location.path()).to.contain('/devices');
    });
});