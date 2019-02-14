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
iotController.controller('termsAndConditionsCtrl', function($scope,
    $rootScope,
    $window,
    $routeParams,
    usersService,
    loginService) {

    $scope.termsAndConditions = function(){
        $('#termsAndConditionModal').appendTo("body");
        $('#termsAndConditionModal').modal('show');
    };

    $scope.accept = function(){
        $scope.error=null;
        loginService.currentUser(
            function (data) {
                data.termsAndConditions = true;
                usersService.updateUser(data, function(){
                    $window.location = '/ui/dashboard';
                }, function(data){
                    $scope.error = data;
                });
            },function(data){
                $scope.error = data;
            });
    };

    $scope.cancel = function(){
        $window.location = "/ui/logout";
    };

});