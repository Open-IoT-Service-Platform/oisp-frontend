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


iotApp.directive('iotSearchDevices', function (devicesService, sessionService, $q, ngTableParams, $filter) {

    function link(scope) {
        scope.availableProperties = [];
        scope.Object = Object;
        scope.isLoading = true;
        scope.filters.limit = 20; //With device minimum name length 4 characters you can fit about 18 in one line with 1920 px width
        scope.filters.devices = {
            status: {
                "operator": "eq",
                "value": "active"
            },
            name: {
                "operator": "like"
            },
            tags: {
                "operator": "all",
                value: []
            },
            properties: {},
            components: {
                "operator": "exists",
                "value": true
            }
        };



        var BUTTON_LOADED_CHECK_INTERVAL = 500; //ms
        scope.setTooltip = function(deviceId) {

            //fetching the device to which tooltip belongs
            var device = scope.searchResult.devices.find(function (element) {
                return element.deviceId === deviceId;
            });

            //constructing the info about device as a tooltip's content
            var title = scope.i18n.device.name + ": " + device.name + "<br/>";
            title = title + scope.i18n.device.gateway + ": " + device.gatewayId + "<br/>";

            if (device.components && device.components.length > 0) {
                title = title + scope.i18n.device.components;
                title = title + ":<br/>";
                title = title + "<ul>";

                device.components.forEach(function (component) {
                    title = title + "<li>" + component.type + "</li>";
                });
                title = title + "</ul>";
            } else {
                title = title + scope.i18n.device.noComponents;
            }

            /* using setInterval is necessary because devices buttons loads with delay in DOM (through ngRepeat)
               and assigning the tooltip to selector fails if we would not wait for it
            */
            var intervalFunction = setInterval(function () {
                var selector = $("#button" + deviceId);

                if (selector.length > 0) {
                    selector.tooltip({
                        placement: "bottom",
                        title: title,
                        html: true
                    });

                    clearInterval(intervalFunction);
                }
            }, BUTTON_LOADED_CHECK_INTERVAL);

        };


        function searchDevices() {
            // only used by rules
            if (scope.chosen) {
                scope.chosen.applyForAll = false;
            }

            if(sessionService.getCurrentAccount()) {
                devicesService.countDevices(scope.filters.devices, function (data) {
                    var deviceTotal = data.device.total;
                    if (deviceTotal !== 0) {
                        devicesService.searchDevices(scope.filters.devices, {limit: scope.filters.limit}, function (data) {
                            var orderedData = $filter('orderBy')(data, function (item) {
                                return item.components ? item.components.length : 0;
                            }, true);
                            scope.searchResult.devices = orderedData;
                            scope.searchResult.deviceTotal = deviceTotal;

                            if (scope.searchResult.devices.length > 0 && document.getElementById('chb_apply')) {
                                document.getElementById('chb_apply').setCustomValidity('');
                            }

                            scope.isLoading = false;
                        }, function () {
                            scope.searchResult.devices = [];
                        });
                    } else {
                        scope.searchResult.devices = [];
                        scope.isLoading = false;
                    }
                });
            }
        }

        scope.viewDevices = function () {
            $('#devicesModal').appendTo("body");
            $('#devicesModal').one('hidden.bs.modal', scope.recreateDevicesTable);
            $('#devicesModal').modal('show');
            $(".modal-backdrop").appendTo("iot-search-devices");
        };

        var selectedDevicesGetData = function($defer, params) {
            var orderedData = $filter('orderBy')(scope.selectedDevicesFilter(), params.orderBy());
            orderedData = params.filter() ?
                $filter('filter')(orderedData, params.filter()) :
                orderedData;

            $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            params.total(orderedData.length);
        };

        scope.viewSelectedDevices = function (){
            scope.viewDevices();

            /*jshint newcap: false */
            scope.tableDevices = new ngTableParams({
                page: 1,            // show first page
                count: 8           // count per page
            }, {
                getData: selectedDevicesGetData
            });
            /*jshint newcap: true */
        };

        scope.selectProperty = function () {

            var index = angular.element("#searchProperty option:selected").attr("value");

            scope.filters.devices.properties[index] = {
                "name": index,
                "operator": "eq",
                "value": ""
            };

            angular.element("#searchProperty option[value='" + index + "']").attr("disabled", "disabled");
            scope.search.property = null;
        };

        scope.removeFilter = function (filter) {
            scope.search.property = null;
            var index = scope.filters.devices.properties[filter].name;
            delete(scope.filters.devices.properties[filter]);
            angular.element("#searchProperty option[value='" + index + "']").removeAttr("disabled");
        };

        scope.allVisibleDevices = function (all) {
            var visibleAmount = scope.maxVisibleDevices();

            if(!all) {  // Deselect all, not only visible
                Object.keys(scope.filters.chart.devices).forEach(function (key) {
                    scope.filters.chart.devices[key] = all;
                });
            }

            scope.searchResult.devices.some(function (item, index) {
                scope.filters.chart.devices[item.deviceId] = all;
                return index >= visibleAmount - 1;
            });
        };

        scope.applyForFutureDevices = function (selected) {
            if ((scope.filters.devices.name.value !== undefined || scope.filters.devices.tags.value.length > 0) &&
                scope.searchResult.devices.length > 0) {

                scope.allVisibleDevices(selected);
                angular.element('#allDevicesBtn').attr('disabled', selected);
            }
        };

        scope.$on('event:edit-rule-with-no-device-ids', function (event, data) {
            scope.applyForFutureDevices(data.selected);
        });

        scope.maxVisibleDevices = function () {
            var availableSpace = angular.element(".devices-list").width();
            availableSpace = availableSpace - angular.element("#allDevicesBtn").width() - 350;

            var count = 1;
            angular.element(".device-list-item").each(function () {
                availableSpace = availableSpace - angular.element(this).outerWidth();
                if (availableSpace > 0) {
                    count++;
                }
            });

            return count;
        };

        scope.$watch(sessionService.getCurrentAccount, function (acc) {
            if (acc) {
                devicesService.getTags(function (data) {
                    scope.tags = data;
                }, function () {
                    scope.tags = [];
                });
                devicesService.getAttributes(function (data) {
                    scope.availableProperties = {};
                    if (data && angular.isObject(data)) {
                        Object.keys(data).forEach(function (k) {
                            scope.availableProperties[k] = {
                                name: k.substring(0, 1).toUpperCase() + k.substring(1).toLowerCase(),
                                values: data[k]
                            };
                        });
                    }
                }, function () {
                    scope.availableProperties = {};
                });

            }
        });

        scope.queryTags = function () {
            return scope.tags;
        };

        scope.searchDevices = function () {
            if (sessionService.getCurrentAccount()) {
                searchDevices();
            }
        };

        scope.$watch('filters.devices', function () {
            if (sessionService.getCurrentAccount()) {
                searchDevices();
            }
        }, true);

        scope.selectedComponents = [];
        scope.selectedActiveDevices = {};

        scope.selectedDevicesFilter = function() {
            var selected = Object.keys(scope.filters.chart.devices).filter(function(i){
                return scope.filters.chart.devices[i];
            });

            Object.keys(scope.selectedActiveDevices).forEach(function(key){
                if(selected.indexOf(key) === -1) {
                    delete scope.selectedActiveDevices[key];
                }
            });

            return Object.keys(scope.selectedActiveDevices).map(function(key){
                return scope.selectedActiveDevices[key];
            });
        };

        scope.areAllVisibleDevicesSelected = function () {
            var visibleAmount = scope.maxVisibleDevices();
            var allVisibleSelected = true;
            scope.searchResult.devices.some(function (item, index) {
                if(!scope.filters.chart.devices[item.deviceId]) {
                    allVisibleSelected = false;
                    return true;
                }
                return index >= visibleAmount - 1;
            });
            return allVisibleSelected;
        };

        scope.selectedDevices = function(){
            scope.selectedComponents = [];
            var selected = Object.keys(scope.filters.chart.devices).filter(function (i) {
                return scope.filters.chart.devices[i];
            });

            scope.all = selected.length > 0 && scope.areAllVisibleDevicesSelected();
            scope.filters.chart.allDevicesButton = scope.all;

            selected.forEach(function (s) {
                var selectedDevices = scope.searchResult.devices.filter(function (d) {
                    return d.deviceId === s;
                });

                selectedDevices.forEach(function (sd) {
                    if (sd.components && sd.components.length > 0) {
                        scope.selectedComponents = scope.selectedComponents.concat(sd.components);

                        if (!(sd.deviceId in scope.selectedActiveDevices)) {
                            scope.selectedActiveDevices[sd.deviceId] = sd;
                        }
                    }
                });
            });
            return selected;
        };

        scope.selectDevice = function (device) {
            var deviceFound = $.grep(scope.searchResult.devices, function (dev) {
                return dev.deviceId === device.deviceId;
            });

            if (deviceFound.length === 0) {
                scope.searchResult.devices.push(device);
            }
        };
    }

    return {
        restrict: 'E',
        link: link,
        templateUrl: 'public/partials/directives/iotSearchDevices.html'
    };
});
