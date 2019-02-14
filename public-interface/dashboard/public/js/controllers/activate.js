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
iotController.controller('ActivateUserCtrl', function($scope,
    $rootScope,
    $window,
    $routeParams,
    $timeout,
    usersService) {
    $scope.error = null;

    $scope.cancel = function(){
        if($scope.currentUser){
            usersService.deleteUser('me', function(){}, function(){});
        }
        $window.location = "/ui/logout";
    };

    if($routeParams.token) {
        usersService.activateUser($routeParams.token,
            function(){
                $timeout($scope.cancel, 4000);
            },function(){
                $scope.error = $scope.i18n.auth.bad_token;
            }
        );
    } else {
        $scope.cancel();
    }
});