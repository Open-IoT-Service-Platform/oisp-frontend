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
iotServices.factory('usersService', ['$http', 'utilityService','sessionService', function($http,
    utilityService, sessionService) {

    var _data = {
        user : null,
        userList : []
    };

    return {
        getUsers: function(successCallback, errorCallback){
            sessionService.addAccountIdPrefix('/users')
                .then(function(url) {
                    $http({
                        method: 'GET',
                        url: url,
                        params: {
                            "_": utilityService.timeStamp()
                        }
                    }).success(function (data, status) {
                        _data.userList = data;
                        if (successCallback) {
                            successCallback(data, status);
                        }
                    }).error(errorCallback);
                });
        },
        getUser: function(userId, successCallback, errorCallback){
            $http({
                method: 'GET',
                url: '/users/' + userId
            }).success(successCallback).error(errorCallback);
        },
        addUser: function(user, successCallback, errorCallback){
            $http({
                method: 'POST',
                url: '/users',
                data: user
            }).success(successCallback).error(errorCallback);
        },
        requestVerifyMail: function(data, successCallback, errorCallback){
            $http({
                method: 'POST',
                url: '/users/request_user_activation',
                data: data
            }).success(successCallback).error(errorCallback);
        },
        updateUser: function(user, successCallback, errorCallback){
            $http({
                method: 'PUT',
                url: '/v1/api/users/' + user.id,
                data: user
            }).success(successCallback).error(errorCallback);
        },
        updateUserAccounts: function(user, successCallback, errorCallback){
            sessionService.addAccountIdPrefix('/users/' + user.id)
                .then(function(url) {
                    $http({
                        method: 'PUT',
                        url: url,
                        data: user
                    }).success(successCallback).error(errorCallback);
                });
        },
        deleteUser: function(user, successCallback, errorCallback){
            $http({
                method: 'DELETE',
                url: '/users/'+user
            })
                .success(successCallback).error(errorCallback);
        },
        activateUser: function(token, successCallback, errorCallback){
            $http({
                method: 'POST',
                url: '/users/activate',
                data: {token: token}
            })
                .success(successCallback).error(errorCallback);
        },
        addPasswordToken: function(user, successCallback, errorCallback){
            $http({
                method: 'POST',
                url: '/users/forgot_password',
                data: { email: user }
            })
                .success(successCallback).error(errorCallback);
        },
        getPasswordToken: function(token, successCallback, errorCallback){
            $http({
                method: 'GET',
                url: '/users/forgot_password?token='+token
            })
                .success(successCallback).error(errorCallback);
        },
        changePassword: function(token, password, successCallback, errorCallback){
            $http({
                method: 'PUT',
                url: '/users/forgot_password',
                data: {
                    token: token,
                    password: password
                }
            })
                .success(successCallback).error(errorCallback);
        },
        changePasswordWithCurrentPwd: function(email, oldPass, password, successCallback, errorCallback){
            $http({
                method: 'PUT',
                url: '/users/'+ email+ '/change_password',
                data: {
                    currentpwd: oldPass,
                    password: password
                }
            })
                .success(successCallback).error(errorCallback);
        },
        getUserSettings: function(accountId, category, successCallback, errorCallback){
            $http({
                method: 'GET',
                url: accountId ? '/v1/api/accounts/' + accountId + '/users/me/settings/' + category:
                    '/v1/api/users/me/settings/'+category
            }).success(successCallback).error(errorCallback);
        },
        getUserSetting: function(accountId, category, id, successCallback, errorCallback){
            $http({
                method: 'GET',
                url: accountId? '/v1/api/accounts/'+accountId+'/users/me/settings/'+category+'/'+id:
                    '/v1/api/users/me/settings/'+category+'/'+id
            })
                .success(successCallback).error(errorCallback);
        },
        addUserSettings: function(accountId, category, data, successCallback, errorCallback){
            $http({
                method: 'POST',
                url: accountId? '/v1/api/accounts/'+accountId+'/users/me/settings/'+category:
                    '/v1/api/users/me/settings/'+category,
                data: data
            })
                .success(successCallback).error(errorCallback);
        },
        updateUserSetting: function(accountId, category, id, data, successCallback, errorCallback){
            $http({
                method: 'PUT',
                url: accountId? '/v1/api/accounts/'+accountId+'/users/me/settings/'+category+'/'+id:
                    '/v1/api/users/me/settings/'+category+'/'+id,
                data: data
            }).success(successCallback).error(errorCallback);
        },
        deleteUserSetting: function(accountId, category, id, successCallback, errorCallback){
            $http({
                method: 'DELETE',
                url: accountId? '/v1/api/accounts/'+accountId+'/users/me/settings/'+category+'/'+id:
                    '/v1/api/users/me/settings/'+category+'/'+id
            }).success(successCallback).error(errorCallback);
        },
        data: _data
    };
}
]);
