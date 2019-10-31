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

"use strict";
iotServices.factory('devicesService', ['$http', 'sessionService', function ($http, sessionService) {
    var flatLocation = function (device) {
        if (device.loc && device.loc.latitude && device.loc.longitude) { // required location field
            var loc = [device.loc.latitude, device.loc.longitude];
            if (device.loc.height) { // optional location field
                loc.push(device.loc.height);
            }
            device.loc = loc;
        } else {
            delete device.loc;
        }

        return device;
    };
    var unflatLocation = function (device) {
        if (device.loc) {
            var loc = {latitude: device.loc[0], longitude: device.loc[1]}; // required location field
            if (device.loc.length === 3) { // optional location field
                loc.height = device.loc[2];
            }
            device.loc = loc;
        }

        return device;
    };
    var formatDevice = function (device) {
        if (device.tags !== undefined && device.tags.length === 0) {
            delete device.tags;
        }
        return flatLocation(device);
    };
    var unformatDevice = function (device) {
        if (!device.tags) {
            device.tags = [];
        }
        return unflatLocation(device);
    };

    var summary = {
        device: 0
    };

    return {
        getTotal: function (callback) {
            sessionService.addAccountIdPrefix('/devices/totals')
                .then(function (url) {
                    var opt = {
                        method: 'GET',
                        params: {
                            "_invalidateCache": new Date().getTime()
                        },
                        url: url
                    };
                    $http(opt).success(function (data) {
                        if (data && data.device) {
                            summary.device = data.device;
                            if (callback) {
                                callback(data.device);
                            }
                        }
                    }).error(function () {
                        if (callback) {
                            callback(null);
                        }
                    });
                });
        },
        getDevices: function (queryParameters, successCallback, errorCallback) {
            sessionService.addAccountIdPrefix('/devices?' + decodeURIComponent($.param(queryParameters)))
                .then(function (url) {
                    $http({
                        method: 'GET',
                        url: url
                    }).
                        success(successCallback)
                        .error(errorCallback);
                });
        },
        deleteDevice: function (deviceId, successCallback, errorCallback) {
            sessionService.addAccountIdPrefix('/devices/' + deviceId)
                .then(function (url) {
                    $http({
                        method: 'DELETE',
                        url: url
                    }).success(successCallback).error(errorCallback);
                });

        },
        addDevice: function (device, successCallback, errorCallback) {
            var clone = JSON.parse(JSON.stringify(device));
            clone = formatDevice(clone);
            sessionService.addAccountIdPrefix('/devices/')
                .then(function (url) {
                    $http({
                        method: 'POST',
                        url: url,
                        data: clone
                    }).success(successCallback).error(errorCallback);
                });
        },
        updateDevice: function (device, successCallback, errorCallback) {
            var clone = JSON.parse(JSON.stringify(device));
            var id = device.deviceId;
            clone = formatDevice(clone);
            delete clone.uid;
            delete clone.deviceId;
            delete clone.status;
            delete clone.created;
            delete clone.components;
            delete clone.activationCode;
            sessionService.addAccountIdPrefix('/devices/' + id)
                .then(function (url) {
                    $http({
                        method: 'PUT',
                        url: url,
                        data: clone
                    }).success(successCallback).error(errorCallback);
                });
        },
        getDevice: function (deviceId, successCallback, errorCallback) {
            sessionService.addAccountIdPrefix('/devices/' + deviceId)
                .then(function (url) {
                    $http({
                        method: 'GET',
                        url: url
                    }).success(function (data, status) {
                        successCallback(unformatDevice(data), status);
                    }).error(errorCallback);
                });
        },
        searchDevices: function (filters, queryParameters, successCallback, errorCallback) {
            sessionService.addAccountIdPrefix('/devices/search?' + decodeURIComponent($.param(queryParameters)))
                .then(function (url) {
                    $http({
                        method: 'POST',
                        url: url,
                        data: filters
                    }).success(successCallback).error(errorCallback);
                });
        },
        countDevices: function (filters, successCallback, errorCallback) {
            sessionService.addAccountIdPrefix('/devices/count')
                .then(function (url) {
                    $http({
                        method: 'POST',
                        url: url,
                        data: filters
                    }).success(successCallback).error(errorCallback);
                });
        },
        getTags: function (successCallback, errorCallback) {
            sessionService.addAccountIdPrefix('/devices/tags')
                .then(function (url) {
                    $http({
                        method: 'GET',
                        url: url
                    }).success(successCallback).error(errorCallback);
                });
        },
        getAttributes: function (successCallback, errorCallback) {
            sessionService.addAccountIdPrefix('/devices/attributes')
                .then(function (url) {
                    $http({
                        method: 'GET',
                        url: url
                    }).success(successCallback).error(errorCallback);
                });
        },
        data: summary
    };
}]);
