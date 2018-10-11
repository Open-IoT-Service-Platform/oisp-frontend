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

var SearchLocationModalInstanceCtrl = function ($scope, $modalInstance) {
    $scope.ok = function () {
        $modalInstance.close();
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
};

var ComponentDefinitionModalInstanceCtrl = function ($scope, $modalInstance, component, componentsService) {
    $scope.addEditMode = "view";

    componentsService.getComponentDefinition(component.type, function(data){
        $scope.component = data;
        $scope.component.name = component.name;
        $scope.component.componentId = component.cid;
    }, function(data){
        $scope.error = data.message || data;
    });

    $scope.close = function () {
        $modalInstance.close();
    };
};

iotController.controller('AddEditDeviceCtrl', function($scope,
                                                $rootScope,
                                                $location,
                                                $filter,
                                                $routeParams,
                                                $modal,
                                                devicesService,
                                                sessionService) {

    $scope.$parent.page = {
        menuSelected: "devices",
        title : $rootScope.i18n.device.title_add
    };

    $scope.showDeviceDetail = true;
    $scope.addMode = true;

    if($routeParams.deviceId){
        $scope.addMode = false;
        $scope.$watch(sessionService.getCurrentAccount, function(data) {
            if (data) {
                devicesService.getDevice($routeParams.deviceId, function (data) {
                        $scope.device = data;
                        if (typeof data.loc !== "undefined") {
                            var loc = {
                                latitude : parseFloat(data.loc.latitude),
                                longitude : parseFloat(data.loc.longitude),
                                height : parseFloat(data.loc.height)
                            };
                            $scope.device.loc = loc;
                        }
                    },
                    function (error) {
                        $scope.error = error.message || error;
                    });
            }
        });
    }

    $scope.showMap = function () {
        var modalInstance = $modal.open({
            templateUrl: 'public/partials/selectLocation.html',
            controller: SearchLocationModalInstanceCtrl
        });

        modalInstance.result.then(function (selectedItem) {
            $scope.selected = selectedItem;
        }, function () {

        });
    };

    var goToDevices = function(){
        $location.path('/devices');
    };

    $scope.saveDevice = function(){
    	var loc = $scope.device.loc;
    	if (typeof loc !== "undefined") {
        	loc.latitude = typeof loc.latitude !== "number" ? parseFloat(loc.latitude) : loc.latitude;
        	loc.longitude = typeof loc.longitude !== "number" ? parseFloat(loc.longitude) : loc.longitude;
        	loc.height = typeof loc.height !== "number" ? parseFloat(loc.height) : loc.height;
    	}   	
        if($scope.addMode){
            devicesService.addDevice($scope.device, function(){
                goToDevices();
            }, function(data){
                $scope.error = data.message || 'An unexpected error happened';
            });
        } else {
            devicesService.updateDevice($scope.device, function(){
                goToDevices();
            }, function(data){
                $scope.error = data.message || 'An unexpected error happened';
            });
        }
    };

    $scope.cancel = function(){
        goToDevices();
    };

    $scope.getTagClass = function() {
        return 'label label-info';
    };

    $scope.tags = [];

    $scope.queryTags = function(){
        return $scope.tags;
    };

    $scope.$watch(sessionService.getCurrentAccount, function(data) {
        if (data) {
            devicesService.getTags(function (data) {
                $scope.tags = data;
            }, function () {

            });
        }
    });

    $scope.openComponentDefinition = function(component){
        $modal.open({
            templateUrl: 'public/partials/devices/componentDefinition.html',
            controller: ComponentDefinitionModalInstanceCtrl,
            resolve: {
                component: function () {
                    return component;
                }
            }
        });
    };

    $scope.show = {
        details: false,
        components: false,
        attributes: false
    };
});