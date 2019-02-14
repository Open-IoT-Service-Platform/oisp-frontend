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

/* global getServicesConfig */

iotController.controller('ResetPasswordCtrl', function($scope,
    $rootScope,
    $window,
    $routeParams,
    usersService,
    loginService) {

    $scope.invalidPassword = false;
    // If the user is already logged in, redirect
    loginService.currentUser(
        function (data) {
            $scope.currentUser = data;
            if(data.verified || !getServicesConfig('verifyUserEmail')) {
                $window.location = '/ui/dashboard';
            } else {
                $window.location = '/';
            }
        },
        function () {}
    );
    $scope.cancel = function(){
        $window.location = "/";
    };
    if($routeParams.token) {
        usersService.getPasswordToken($routeParams.token,
            function(data){
                $scope.user = data.email;
            },function(){
                $scope.error = $scope.i18n.auth.bad_token;
            }
        );
    } else {
        $window.location = "/";
    }
    $scope.changePassword = function () {
        if($routeParams.token) {
            usersService.changePassword($routeParams.token, $scope.password,
                function () {
                    $scope.invalidPassword = false;
                    $scope.error = undefined;
                    $scope.message = $scope.i18n.auth.password_changed;
                }, function (data) {
                    if(data.code === 2401) {
                        $scope.invalidPassword = true;
                        $scope.error = data.message;
                    } else {
                        $scope.error = $scope.i18n.auth.bad_token;
                    }
                }
            );
        }
    };
});
