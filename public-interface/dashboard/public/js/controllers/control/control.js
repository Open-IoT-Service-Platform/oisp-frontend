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
iotController.controller('controlCtrl', function($scope,
                                                 $rootScope,
                                                 $filter,
                                                 $modal,
                                                 $timeout,
                                                 componentsService,
                                                 controlService,
                                                 sessionService){
    $scope.$parent.page = {
        menuSelected: "control",
        title: $rootScope.i18n.control.title
    };

    $scope.complexCommands = [];
    $scope.complexActions = [];
    $scope.actionsList = [];
    function loadComplexCommands() {
        controlService.getComplexCommands(function(commands) {
            $scope.complexCommands = commands;
        }, errorHandler);
    }

    $scope.addComplexAction = function(id) {
        $scope.complexActions.push({id: id, status: readyStatusName});
    };

    $scope.deleteComplexAction = function(action) {
        var index = $scope.complexActions.indexOf(action);
        $scope.complexActions.splice(index, 1);
    };

    $scope.$watch(sessionService.getCurrentAccount, function(data) {
            if(data) {
                loadComplexCommands();
            }
    });

    $scope.filters = {
        chart: {
            devices: {},
            components: {}
        }
    };
    $scope.searchResult = {};

    $scope.customComponents = true;

    $scope.transportType = [
        {id: 'mqtt', name: 'mqtt'},
        {id: 'ws', name: 'websockets'}
    ];

    $scope.$watch('filters.chart.devices', function () {
        $scope.searchResult.components = [];
        Object.keys($scope.filters.chart.devices).forEach(function (item) {
            if ($scope.filters.chart.devices[item]) {
                var device = $scope.searchResult.devices.filter(function (device) {
                    return device.deviceId === item;
                })[0];
                if (device && device.components) {
                    device.components.forEach(function (component) {

                        if (component.componentType.type === "actuator" && component.componentType.command) {
                            var data = {
                                type: component.type,
                                name: component.name,
                                id: component.cid,
                                device: device.name,
                                catalog: component.componentType
                            };

                            $scope.searchResult.components.push(data);
                            var title = $scope.i18n.control.componentId + ": " + data.id + "<br/>";
                            title = title + $scope.i18n.control.componentType + ": " + data.type + "<br/>";
                            $scope.addTooltipToComponent(data.id, title);
                        }

                    });
                }
           }
        });
    }, true);

    $scope.addTooltipToComponent = function (componentId, title) {

        var element = $("#button" + componentId);
        if (element.length > 0) {
            element.tooltip({
                placement: "bottom",
                title: title,
                html: true
            });
        }
        else {
            $timeout(function () {
                $scope.addTooltipToComponent(componentId, title);
            }, 300);
        }
    };

    $scope.allComponents= function (value){
        angular.forEach($scope.searchResult.components, function(item){
            $scope.filters.chart.components[item.id] = value;
        });
    };

    $scope.$watch('filters.chart.components', function(){
        $scope.availableParameters = [];
        $scope.parameterName = "";
        $scope.parameterValue = {
            value: null
        };
        $scope.selectedParameter = {
            parameter: null
        };

        $scope.selectedComponentsList = [];
        Object.keys($scope.filters.chart.components).forEach(function(item) {
            if ($scope.filters.chart.components[item]) {
                var selectedComponentData = $scope.searchResult.components.filter(function(component){
                    return component.id === item;
                })[0];

                if(selectedComponentData){
                    $scope.selectedComponentsList.push(selectedComponentData);

                    if(selectedComponentData.catalog.command){
                        selectedComponentData.catalog.command.parameters.forEach(function(catalogParameter){
                            if(!$scope.availableParameters.some(function(parameter){
                                return parameter.name === catalogParameter.name &&
                                    parameter.values === catalogParameter.values;
                            })){
                                $scope.availableParameters.push(catalogParameter);
                            }
                        });
                    }
                }
            }
        });     
    }, true);

    $scope.selectedParameter = {
        parameter: null
    };

    $scope.$watch('selectedParameter.parameter', function(){
        $scope.parameterValue = {
            value: null
        };

        if(!$scope.selectedParameter.parameter){
            return;
        }

        $scope.availableValues = {
            min: null,
            max: null,
            list: null,
            uniqueValue:null
        };

        var matches = $scope.selectedParameter.parameter.values.match(/-/g);
        var range = $scope.selectedParameter.parameter.values.split("-");
        if(matches && matches.length === 1 &&
            !isNaN(range[0]) && !isNaN(range[1])){
            //the valid values are defined by a range
            $scope.availableValues.min = range[0];
            $scope.availableValues.max = range[1];

            $scope.parameterValue.value = parseFloat(range[0]);
        }else{
            //the valid values are defined by a list of values (or a single value)
            var valuesArray = $scope.selectedParameter.parameter.values.split(",");

            if(valuesArray.length === 1){
                $scope.availableValues.uniqueValue = valuesArray[0];
            } else {
                $scope.availableValues.list = valuesArray;
            }
        }
    },true);

    $scope.setSliderValue = function(value){
        var currentValue = parseFloat($scope.parameterValue.value);
        if(!currentValue){
            currentValue = 0;
        }

        var newValue = currentValue  + value;
        if(newValue < $scope.availableValues.min){
            newValue = $scope.availableValues.min;
        }
        if(newValue > $scope.availableValues.max){
            newValue = $scope.availableValues.max;
        }
        $scope.parameterValue.value = newValue;
        $("#parameterValueSlider").focus();
    };

    var readyStatusName = 'ready';
    var invalidStatusName = 'invalid';
    var sentStatusName = 'sent';
    var savedStatusName = 'saved';

    function getStatus(component, parameterName, parameterValue){
        var result = invalidStatusName;

        if(component.catalog.command.parameters.some(function(supportedParameter){
            var supported = true;

            if(supportedParameter.name !== parameterName){
                supported = false;
            }

            var matches = supportedParameter.values.match(/-/g);
            var range = supportedParameter.values.split("-");
            if(matches && matches.length === 1 &&
                !isNaN(range[0]) && !isNaN(range[1])){
                //the valid values are defined by a range
                var min = range[0];
                var max = range[1];
                parameterValue = parseFloat(parameterValue);

                if(parameterValue > max || parameterName < min){
                    supported = false;
                }
            }else{
                //the valid values are defined by a list of values (or a single value)
                var valuesArray = supportedParameter.values.split(",");

                if(valuesArray.indexOf(parameterValue) === -1){
                    supported = false;
                }
            }

            return supported;

        })){
            result = readyStatusName;
        }

        return result;
    }

    function orderActions() {
        var orderedData = $filter('orderBy')($scope.actionsList, ['device', 'componentId', 'commandName']);
        var firstDevice = -1,
            firstComponent = -1;
        for (var i = 0; i < orderedData.length; i++) {
            if (firstDevice === -1 || orderedData[i].device !== orderedData[firstDevice].device) {
                firstDevice = i;
                orderedData[i].firstDevice = true;
                orderedData[i].deviceRowSpan = 1;
            } else {
                orderedData[i].firstDevice = false;
                orderedData[i].deviceRowSpan = 0;
                orderedData[firstDevice].deviceRowSpan = orderedData[firstDevice].deviceRowSpan + 1;
            }
            if (firstComponent === -1 || orderedData[i].componentId !== orderedData[firstComponent].componentId) {
                firstComponent = i;
                orderedData[i].firstComponent = true;
                orderedData[i].componentRowSpan = 1;
            } else {
                orderedData[i].firstComponent = false;
                orderedData[i].componentRowSpan = 0;
                orderedData[firstComponent].componentRowSpan = orderedData[firstComponent].componentRowSpan + 1;
            }
        }
        $scope.actionsList = orderedData;
    }

    $scope.addAction = function(){
        $scope.selectedComponentsList.forEach(function(component){
            var item = {
                device: component.device,
                componentId: component.id,
                componentName: component.name,
                status: getStatus(component, $scope.selectedParameter.parameter.name, $scope.parameterValue.value),
                commandName: $scope.selectedParameter.parameter.name,
                commandValue: $scope.parameterValue.value,
                transport: $scope.selectedParameter.transport
            };

            if(!$scope.actionsList){
                $scope.actionsList =[];
            }

            $scope.actionsList.push(item);
        });

        orderActions();
    };

    $scope.deleteAction = function(action){
        var index = $scope.actionsList.indexOf(action);
        $scope.actionsList.splice(index, 1);

        orderActions();
    };

    $scope.clear = function(){
        $scope.actionsList = [];
        $scope.complexActions = [];
    };

    function prepareCommands(actions, complexActions) {
        var data = {
            commands: [],
            complexCommands: complexActions.map(function(action) {return action.id;})
        };

        var currentComponent;

        var createAndAddCommand = function (action, transport) {
            currentComponent = {
                componentId: action.componentId,
                transport: transport,
                parameters: [
                    {
                        name: action.commandName,
                        value: action.commandValue.toString()
                    }
                ]
            };
            data.commands.push(currentComponent);
        };

        actions.forEach(function(action) {
            if(action.status === readyStatusName){
                if(!currentComponent){
                    createAndAddCommand(action, action.transport.id);
                } else {
                    if(action.componentId === currentComponent.componentId){
                        currentComponent.parameters.push({
                            name: action.commandName,
                            value: action.commandValue.toString()
                        });
                    } else {
                        createAndAddCommand(action, action.transport.id);
                    }
                }
            }
        });

        return data;
    }

    var errorHandler = function(data){
        if(data.errors) {
            $scope.errors = [data.errors];
        } else {
            $scope.errors = [];
        }
        $scope.pending = false;
    };

    function sendActions(actions, complexActions){
        $scope.pending = true;

        controlService.sendAction(prepareCommands(actions, complexActions), function(){
            actions.concat(complexActions).forEach(function(action) {
                if(action.status === readyStatusName) {
                    action.status = sentStatusName;
                }
            });
            $scope.pending = false;
        }, errorHandler);
    }

    function saveActions(actions){
        showSaveDialog(function(enteredName) {
            return saveComplexCommandAs(enteredName, actions);
        });
    }

    function saveComplexCommandAs(enteredName, actions) {
        var preparedCommands = prepareCommands(actions, []);
        delete preparedCommands.complexCommands;
        return controlService.saveAction(preparedCommands, enteredName, function(){
            for (var i = 0; i < actions.length; i++) {
                if (actions[i].status === readyStatusName) {
                    actions[i].status = savedStatusName;
                }
            }
            $scope.pending = false;
            loadComplexCommands();
        }, function() {
            $scope.errors = [$scope.i18n.api_errors.ComponentCommands.InvalidCommand.message];
        });
    }

    function showSaveDialog(action) {
        return $modal.open({
            templateUrl: 'public/partials/control/saveComplexCommand.html',
            controller: function ($scope, $modalInstance) {
                $scope.confirm = function () {
                    action(this.name)
                        .then(function() {
                            $modalInstance.close();
                        })
                        .catch(function(err) {
                            if(err.data && err.data.message) {
                                $scope.error = err.data.message;
                            } else {
                                $scope.error = err;
                            }
                        });
                };
                $scope.cancel = function () {
                    $modalInstance.dismiss('cancel');
                };
            }
        }).result;
    }

    $scope.showComplexAction = function(action) {
        var complexCommand = $scope.complexCommands.filter(function (c) {
            return c.id === action.id;
        })[0];
        return $modal.open({
            templateUrl: 'public/partials/control/complexCommandDetails.html',
            controller: function ($scope, $modalInstance) {
                $scope.close = function () {
                    $modalInstance.close();
                };
                $scope.complexCommand = complexCommand;
            }

        });
    };

    $scope.deleteComplexCommand = function(id) {
        return controlService.deleteAction(id, function() {
           loadComplexCommands();
        }, function() {
            $scope.errors = [$scope.i18n.control.error_delete];
        });
    };

    $scope.send = function(action){
        sendActions([action], []);
    };

    $scope.sendComplexAction = function(action) {
        sendActions([], [action]);
    };

    $scope.sendAll = function(){
        sendActions($scope.actionsList, $scope.complexActions);
    };

    $scope.saveAll = function() {
        saveActions($scope.actionsList);
    };

    $scope.show = {
        complexCommands: true,
        searchDevice : true,
        selectDevice : true
    };
});