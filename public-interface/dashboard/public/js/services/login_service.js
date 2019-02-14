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

iotServices.factory('loginService', ['$http', function($http){
    return {
        currentUser: function(successCallback, errorCallback){
            $http({
                method: 'GET',
                url: '/ui/auth/me'
            })
                .success(function(data, status){
                    successCallback(data, status);
                }).error(function(data, status){
                    errorCallback(data, status);
                });
        },
        login: function(user, successCallback, errorCallback){
            $http({
                method: 'POST',
                url: '/ui/auth/local',
                data: user
            })
                .success(function(data, status){
                    successCallback(data, status);
                }).error(function(data, status){
                    errorCallback(data, status);
                });
        },
        refreshToken: function(successCallback, errorCallback){
            $http({
                method: 'PUT',
                url: '/ui/auth/me'
            })
                .success(function(data, status){
                    successCallback(data, status);
                }).error(function(data, status){
                    errorCallback(data, status);
                });
        },
        logout: function(successCallback, errorCallback){
            $http({
                method: 'DELETE',
                url: '/ui/auth/me'
            })
                .success(function(data, status){
                    if(successCallback){
                        successCallback(data, status);
                    }
                }).error(function(data, status){
                    if(errorCallback){
                        errorCallback(data, status);
                    }
                });
        },
        getSocialConfig: function (successCallback, errorCallback) {
            $http({
                method: 'GET',
                url: '/ui/auth/social/config'
            })
                .success(function (data, status) {
                    successCallback(data, status);
                }).error(function (data, status) {
                    errorCallback(data, status);
                });
        }
    };
}
]);