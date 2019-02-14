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
iotServices.factory('dataService', ['$http','sessionService', function($http, sessionService){
    var PATH=  "/data";

    var summary = {
        total: 0
    };

    var updateSummary = function(data){
        if(data){
            summary.total = data.count;
        } else {
            summary.total = 0;
        }
    };

    return {
        search: function(filters, canceler, successCallback, errorCallback){
            return sessionService.addAccountIdPrefix(PATH + '/search')
                .then(function(url) {
                    var promise = $http({
                        method: 'POST',
                        url: url,
                        data: filters,
                        timeout: canceler.promise
                    });
                    if (successCallback) {
                        promise
                            .success(successCallback).error(errorCallback);
                    } else {
                        return promise
                            .then(function (response) {
                                return response.data;
                            });
                    }
                });
        },
        getTotal: function(period, callback) {
            sessionService.addAccountIdPrefix('/data/totals?period=' + period)
                .then(function(url) {
                    var opt = {
                        method: 'GET',
                        url: url
                    };
                    $http(opt).success(function (data) {
                        updateSummary(data);
                        if (callback) {
                            callback(data);
                        }
                    }).error(function () {
                        if (callback) {
                            callback(null);
                        }
                    });
                });
        },
        downloadCsv: function(filters, successCallback, errorCallback){
            sessionService.addAccountIdPrefix(PATH + '/search?output=csv')
                .then(function(url) {
                    $http({
                        method: 'POST',
                        url: url,
                        data: filters
                    }).success(successCallback).error(errorCallback);
                });
        },
        sendByEmail: function(filters, recipients, successCallback, errorCallback){
            var data = filters;
            data.recipients = recipients;
            sessionService.addAccountIdPrefix(PATH + '/search?output=email')
                .then(function(url){
                    $http({
                        method: 'POST',
                        url: url,
                        data:data
                    }).success(successCallback).error(errorCallback);
                });
        },
        firstLastMeasurementTimestamp: function(components, successCallback, errorCallback) {
            var data = {
                components: components
            };
            sessionService.addAccountIdPrefix(PATH + '/firstLastMeasurementTimestamp')
                .then(function(url) {
                    $http({
                        method: 'POST',
                        url: url,
                        data: data
                    }).success(successCallback).error(errorCallback);
                });
        },
        data: summary
    };
}]);
