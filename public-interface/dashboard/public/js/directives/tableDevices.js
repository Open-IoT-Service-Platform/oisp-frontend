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

var ConfirmRemoveDeviceModalInstanceCtrl = function ($scope, $modalInstance, device) {
    $scope.device = device;

    $scope.confirm = function () {
        $modalInstance.close(true);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
};

iotApp.directive('tableDevices', function (devicesService, $q, ngTableParams, $modal, $routeParams) {

    function getListDevicesProperties(type) {
        var listDevicesConfigs = {
            "default": {count: 10, counts: [], templateUrl: "public/partials/directives/tableDevices.html"},
            "inModal": {count: 8, counts: [25, 50, 100], templateUrl: "public/partials/directives/tableDevicesInModal.html"}
        };
        if (listDevicesConfigs[type] !== undefined) {
            return listDevicesConfigs[type];
        }
        return listDevicesConfigs["default"];
    }

    function isEmpty(obj) {
        if (obj == null) {
            return true;
        }

        if (obj.length > 0) {
            return false;
        }
        if (obj.length === 0) {
            return true;
        }

        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
                return false;
            }
        }

        return true;
    }

    function link(scope, element, attr) {
        scope.listDevices = {};
        scope.listDevices.devices = [];
        scope.listDevices.hasQueryFilters = false;
        scope.listDevices.filters = {
            status: {
                "operator": "eq"
            },
            name: {
                "operator": "like"
            },
            properties: {

            },
            tags: {
                "operator": "all",
                "value": []
            },
            deviceId: {
                "operator": "like"
            },
            gatewayId: {
                "operator": "like"
            },
            components:{}
        };
        var listDevicesConfig = getListDevicesProperties(attr["type"]);

        if (attr["filterstatus"] !== undefined) {
            scope.listDevices.filters.status.value = attr["filterstatus"];
        }
        if (attr["filtercomponents"] !== undefined) {
            scope.listDevices.filters.components.operator = "exists";
            scope.listDevices.filters.components.value = attr["filtercomponents"] === "exists";
        }

        var tableDevicesGetData = function ($defer, params) {
            var skipPage = (params.page() - 1) * params.count();
            skipPage = skipPage < 0 ? 0 : skipPage;

            var query = {
                skip: skipPage,
                limit: params.count()
            };
            var queryParameters = params.filter();
            for (var attribute in  queryParameters) {
                scope.listDevices.filters[attribute].value = queryParameters[attribute];
            }
            scope.listDevices.hasQueryFilters = Object.keys(queryParameters).length > 0;

            var sort = params.sorting();
            if (!isEmpty(sort)) {
                var keySort = Object.keys(sort)[0];
                query.sort = keySort;
                query.order = sort[keySort];
            }

            devicesService.countDevices(scope.listDevices.filters, function success(data) {
                var deviceTotal = data.device.total;

                if (deviceTotal === 0) {
                    $defer.resolve({});
                    params.total(0);
                } else {
                    devicesService.searchDevices(scope.listDevices.filters, query, function success(data) {
                        scope.listDevices.devices = data;
                        if(scope.searchResult && scope.searchResult.devices) {
                            data.forEach(function (newDev) {
                                var existing = scope.searchResult.devices.some(function (existingDev) {
                                    return existingDev.deviceId === newDev.deviceId;
                                });
                                if (!existing) {
                                    scope.searchResult.devices.push(newDev);
                                }
                            });
                        }
                        $defer.resolve(data, 8);
                        params.total(deviceTotal);
                    }, function error() {

                    });
                }
            });
        };

        scope.recreateDevicesTable = function() {
            /*jshint newcap: false */
            scope.tableDevices = new ngTableParams({
                page: 1,            // show first page
                count: listDevicesConfig.count,           // count per page,
                filter: {
                    status: $routeParams.filter || (attr['type'] === 'inModal' ? 'active' : '')
                }
            }, {
                counts: listDevicesConfig.counts,
                getData: tableDevicesGetData
            });
            /*jshint newcap: true */
        };
        scope.recreateDevicesTable();

        scope.removeDevice = function (device) {
            var removeDeviceModalInstance = $modal.open({
                templateUrl: 'public/partials/devices/confirmDeviceRemoval.html',
                controller: ConfirmRemoveDeviceModalInstanceCtrl,
                resolve: {
                    device: function () {
                        return device;
                    }
                }
            });
            removeDeviceModalInstance.result.then(function () {
                var deviceIndex = scope.listDevices.devices.indexOf(device);
                devicesService.deleteDevice(device.deviceId, function () {
                    scope.listDevices.devices.splice(deviceIndex, 1);
                    scope.tableDevices.reload();
                },
                function (data, status) {
                    var message;
                    if (data && data.message) {
                        message = data.message;
                    } else {
                        message = 'An unexpected error happened';
                    }
                    scope.error = 'Could not delete device: ' + status + ' ' + message;
                });
            }, function () {

            });
            return removeDeviceModalInstance;
        };

        scope.reload = function () {
            scope.tableDevices.reload();
        };

    }

    return {
        restrict: 'E',
        link: link,
        templateUrl: function (item, attr) {
            var listDevicesConfig = getListDevicesProperties(attr["type"]);
            return listDevicesConfig.templateUrl;
        }
    };
});
