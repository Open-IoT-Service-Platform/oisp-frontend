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
iotServices.factory('alertsService', ['$http', 'utilityService','sessionService', function($http, utilityService, sessionService){
    var fireStatusUpdatedEvent = function(ngScope, data) {
        if (ngScope) {
            ngScope.$emit('event:alert-status-changed', data);
        }
    };

    var summary = {
        unread: []
    };

    var removeReadAlerts = function(data){
        return data.filter(function(element) {
            return element.status === "New";
        });
    };

    return {
        getUnreadAlerts: function(){
            sessionService.addAccountIdPrefix('/alerts?status=New')
            .then(function(url){
                $http({
                    method: 'GET',
                    url: url,
                    params: {
                        "_" : utilityService.timeStamp()
                    }
                }).success(function(data){
                    summary.unread = data;
                }).error(function(){
                    summary.unread = [];
                });
            });
        },
        getAlerts: function(successCallback, errorCallback){
            sessionService.addAccountIdPrefix('/alerts')
            .then(function(url){
                $http({
                    method: 'GET',
                    url: url,
                    params: {
                        "_" : utilityService.timeStamp()
                    }
                }).success(function(data) {
                    summary.unread = removeReadAlerts(data);
                }).success(successCallback)
                  .error(errorCallback);
            });
        },
        getAlert: function(alertId, successCallback, errorCallback){
            sessionService.addAccountIdPrefix('/alerts/' + alertId)
            .then(function(url){
                $http({
                    method: 'GET',
                    url: url,
                    params: {
                        "_" : utilityService.timeStamp()
                    }
                }).success(successCallback).error(errorCallback);
            });
        },
        deleteAlerts: function(successCallback, errorCallback){
            sessionService.addAccountIdPrefix('/alerts')
            .then(function(url){
                $http({
                    method: 'DELETE',
                    url: url,
                    params: {
                        "_" : utilityService.timeStamp()
                    }
                }).success(successCallback)
                  .error(errorCallback);
            });
        },
        deleteAlert: function(alertId, successCallback, errorCallback){
            sessionService.addAccountIdPrefix('/alerts/' + alertId)
            .then(function(url){
                $http({
                    method: 'DELETE',
                    url: url,
                    params: {
                        "_" : utilityService.timeStamp()
                    }
                }).success(successCallback).error(errorCallback);
            });
        },
        updateStatus: function(options, successCallback, errorCallback){
            var alert = options.alert,
                alertId = alert.alertId,
                newStatus = options.newStatus,
                ngScope = options.scope;


            sessionService.addAccountIdPrefix('/alerts/' + alertId + '/status/' + newStatus)
            .then(function(url){
                var requestOptions = {
                    method: 'PUT',
                    url: url
                };
                $http(requestOptions).success(function(data, status){
                    fireStatusUpdatedEvent(ngScope, {alert: alert, newStatus: newStatus});
                    successCallback(data, status);
                }).error(errorCallback);
            });

        },
        reset: function(options, successCallback, errorCallback){
            var alert = options.alert,
                alertId = alert.alertId,
                ngScope = options.scope;
            sessionService.addAccountIdPrefix('/alerts/' + alertId + '/reset')
            .then(function(url) {

                var requestOptions = {
                    method: 'PUT',
                    url: url
                };

                $http(requestOptions).success(function (data, status) {
                    fireStatusUpdatedEvent(ngScope, {alert: alert, newStatus: 'Closed'});
                    successCallback(data, status);
                }).error(errorCallback);

            });
        },
        addComments: function(options, successCallback, errorCallback){
            var alertId = options.alertId,
                comments = options.comments;
            sessionService.addAccountIdPrefix('/alerts/' + alertId + '/comments')
            .then(function(url) {
                var requestOptions = {
                    method: 'POST',
                    url: url,
                    data: comments
                };

                $http(requestOptions).success(successCallback).error(errorCallback);
            });
        },
        data: summary
    };
}]);
