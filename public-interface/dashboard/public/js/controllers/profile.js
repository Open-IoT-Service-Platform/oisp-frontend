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
var ProfileModalInstanceCtrl = function($scope,
    $modalInstance,
    usersService,
    flash,
    $timeout,
    $window) {

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

    var parseError = function (data) {
        var userCannotBeRemovedError = 2421;
        if (data && data.code === userCannotBeRemovedError) {
            flash.to('alert-1').error = $scope.i18n.auth.delete_user_only_admin_error;
        } else {
            flash.to('alert-1').error = $scope.i18n.auth.delete_user_error;
        }
    };

    $scope.deleteUser = function () {
        usersService.deleteUser('me', function success() {
            $modalInstance.close();
            flash.to('alert-1').success = $scope.i18n.auth.success_delete_user;
            $timeout(function(){
                $window.location = '/ui/logout';
            }, 5000);
        }, function error(data) {
            $modalInstance.close();
            parseError(data);
        });
    };
};

iotController.controller('profileCtrl', function($scope,
    $window,
    usersService,
    loginService,
    $modal) {

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
        function () {}
    );

    var i18n = $scope.$parent.i18n;

    $scope.$parent.page = {
        menuSelected: "board",
        title : i18n.auth.profile
    };

    $scope.attributesSavedSuccessfully = false;

    $scope.saveAttributes = function(){
        usersService.updateUser($scope.currentUser, function(data){
            $scope.error = data;
            $scope.attributesSavedSuccessfully = true;
        }, function(data){
            $scope.error = data;
            $scope.attributesSavedSuccessfully = false;
        });
    };

    $scope.showUserDeleteWarning = function () {
        var modalInstance = $modal.open({
            templateUrl: 'public/partials/auth/deleteUser.html',
            controller: ProfileModalInstanceCtrl
        });

        return modalInstance;
    };

    $scope.cancel = function(){
        $window.location.reload();
    };
});
