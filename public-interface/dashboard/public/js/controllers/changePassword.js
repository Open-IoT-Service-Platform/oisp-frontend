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
iotController.controller('changePasswordCtrl', function($scope,
    $window,
    usersService,
    loginService) {

    // If the user is already logged in, redirect
    loginService.currentUser(
        function (data) {
            if (data && data.email) {
                $scope.currentUser = data;
                $scope.user = data.email;
            }  else {
                $window.location = "/";
            }

        },
        function (data) {
            $scope.error = data.message || data;
        }
    );
    $scope.cancel = function(){
        $window.location = "/";
    };

    $scope.requireOldPassword = true;
    $scope.current = {pwd: ''};

    $scope.changePassword = function () {
        if($scope.current.pwd) {
            usersService.changePasswordWithCurrentPwd( $scope.user, $scope.current.pwd, $scope.password,
                function () {
                    $scope.message = $scope.i18n.auth.password_changed;
                }, function () {
                    $scope.error = $scope.i18n.auth.bad_token;
                }
            );
        }
    };
});
