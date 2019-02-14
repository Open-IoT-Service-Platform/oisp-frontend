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
iotServices.factory('controlService', ['$http', 'sessionService', function($http, sessionService) {

    return {
        sendAction: function(actions, successCallback, errorCallback){
            return sessionService.addAccountIdPrefix('/control')
                .then(function(url) {
                    return $http({
                        method: 'POST',
                        url: url,
                        data: actions
                    })
                        .success(successCallback)
                        .error(errorCallback);
                });
        },
        saveAction: function (actions, componentName, successCallback, errorCallback) {
            return sessionService.addAccountIdPrefix('/control/commands/'+componentName)
                .then(function(url) {
                    return $http({
                        method: 'POST',
                        url: url,
                        data: actions
                    })
                        .success(successCallback)
                        .error(errorCallback);
                });
        },
        getComplexCommands: function(successCallback, errorCallback) {
            return sessionService.addAccountIdPrefix('/control/commands')
                .then(function(url) {
                    return $http({
                        method: 'GET',
                        url: url
                    })
                        .success(successCallback)
                        .error(errorCallback);
                });
        },
        deleteAction: function (id, successCallback, errorCallback) {
            return sessionService.addAccountIdPrefix('/control/commands/'+id)
                .then(function(url) {
                    return $http({
                        method: 'DELETE',
                        url: url
                    })
                        .success(successCallback)
                        .error(errorCallback);
                });
        }
    };
}]);