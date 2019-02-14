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

iotController.controller('ForgotCtrl', function($scope,
    $rootScope,
    $window,
    usersService,
    loginService) {

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

    $scope.sendMail = function(){
        $scope.error = null;
        $scope.message = null;
        $scope.socialProvider = null;
        usersService.addPasswordToken($scope.email,
            function(data){
                if(data.provider) {
                    $scope.message = $scope.i18n.auth.social_message.replace('%PROVIDER%', data.provider);
                    $scope.socialProvider = data.provider;
                } else {
                    $scope.message = $scope.i18n.auth.mail_sent;
                }
            },function(data){
                if(data.message) {
                    $scope.error = data.message;
                } else {
                    $scope.error = data;
                }
            }
        );
    };

    $scope.socialLogin = function(){
        if($scope.socialProvider){
            $window.location = "/ui/auth/" + $scope.socialProvider;
        }
    };
});
