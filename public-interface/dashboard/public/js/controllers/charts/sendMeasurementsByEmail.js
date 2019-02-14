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
iotController.controller('SendMeasurementsByEmailModalCtrl', function (  $scope,
    $window,
    $timeout,
    $modalInstance,
    users,
    searchFilters,
    dataService) {

    $scope.userList = [];
    $scope.userListFilter = [];
    $scope.emailSelected = null;
    $scope.recipients = [];

    function filterMailSelected  () {
        $scope.userListFilter = $scope.userList.filter (function (user) {
            if(user) {
                for (var i = 0; i < $scope.recipients.length; ++i) {
                    var email = $scope.recipients[i];
                    if (email === user.email) {
                        return false;
                    }
                }
                return true;
            }else{
                return false;
            }
        });
    }

    $scope.$watch('userList', function (val) {
        if (val){
            var da = [];
            for (var i = 0; i < val.length; i++ ) {
                var item = val[i];
                da.push({id: item.id, email: item.email});
            }
            $scope.userList = da;
        }
    }, true);

    $scope.$watch('userList', function() {
        filterMailSelected();
    }, true);

    $scope.emailSelectToNotificate = function (data) {
        if(data && data.email) {
            $scope.recipients.push(data.email);
        }
        filterMailSelected();
    };

    $scope.removeEmailFromNotification = function(dataIndex) {
        $scope.recipients.splice(dataIndex, 1);
        filterMailSelected();
        setTimeout(function(){
            angular.element("#idEmailChosen")[0].selectedIndex = 0;
        }, 100);
    };

    $scope.sendByEmail = function () {
        $scope.error = null;

        delete searchFilters.maxItems;
        dataService.sendByEmail(searchFilters, $scope.recipients, function(){
            $modalInstance.close();
        }, function(data){
            $scope.error = data;
        });
    };
    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

    $scope.userList = users;
});