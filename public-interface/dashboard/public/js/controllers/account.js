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
var ComponentDetailsModalInstanceCtrl = function ($scope, $modalInstance, component, newComponentCallback, mode, currentUser, currentAccount, componentsService) {
    if(mode === "view"){
        $scope.addEditMode = "view";
        $scope.updateable = true;
        componentsService.getComponentDefinition(component.id, function(data){
            $scope.component = data;
        }, function(data) {
            $scope.errors = data.errors || [data.message];
        });
    }else{
        $scope.component = {
            version: "1.0"
        };
        $scope.addEditMode = "new";
    }
    $scope.currentUser = currentUser;
    $scope.currentAccount = currentAccount;

    $scope.save = function(){
        $scope.errors = [];

        var data = {
            dimension: $scope.component.dimension,
            version: $scope.component.version,
            type: $scope.component.type,
            dataType: $scope.component.dataType,
            format: $scope.component.format,
            measureunit: $scope.component.measureunit,
            display: $scope.component.display
        };
        if(!data.format){
            if(data.dataType === "String"){
                data.format = "string";
            } else if (data.dataType === "Boolean"){
                data.format = "boolean";
            }
        }

        if($scope.component.type === "actuator"){
            data.command = $scope.component.command;
            if(data.command && data.command.parameters) {
                data.command.parameters.forEach(function(parameter){
                    delete parameter.display;
                });
            }
        }

        if($scope.component.format === "integer"){
            data.min = isNaN($scope.component.min)? $scope.component.min : parseInt($scope.component.min);
            data.max = isNaN($scope.component.max)? $scope.component.max : parseInt($scope.component.max);
        }
        else if($scope.component.format === "float" || $scope.component.format === "percentage"){
            data.min = isNaN($scope.component.min)? $scope.component.min : parseFloat($scope.component.min);
            data.max = isNaN($scope.component.max)? $scope.component.max : parseFloat($scope.component.max);
        }
        if($scope.addEditMode === "new"){
            if (! data.dimension || data.dimension === "") {
                $scope.errors.push($scope.i18n.component.errors.nameRequired);
            }
            else if(data.dimension.indexOf(" ") !== -1) {
                $scope.errors.push($scope.i18n.component.errors.nameCannotHaveSpace);
            }

            if ($scope.errors.length === 0) {
                componentsService.addComponent(data, function (data) {
                    newComponentCallback(data);
                    $modalInstance.close();
                }, function (data) {
                    if (data.errors) {
                        $scope.errors = data.errors;
                    } else if (data.message) {
                        $scope.errors = [data.message];
                    }
                });
            }
        }
        if($scope.errors.length === 1) {
            $scope.myStyle = {'list-style-type':'none'};
        } else {
            $scope.myStyle = {};
        }
        if($scope.addEditMode === "edit"){
            delete data.dimension;
            delete data.version;
            componentsService.editComponent($scope.component.id, data, function(data){
                newComponentCallback(data);
                $modalInstance.close();
            }, function(data){
                if(data.errors){
                    $scope.errors = [data.errors];
                } else {
                    $scope.errors = [data.errors];
                }
            });
        }
    };

    $scope.newVersion = function() {
        $scope.addEditMode = "edit";
        $scope.updateable = false;
    };

    $scope.emptyParameter = function() {
        if(!$scope.component.command){
            $scope.component.command = {
                parameters: []
            };
        }
        if(!$scope.component.command.parameters){
            $scope.component.command.parameters = [];
        }
        $scope.component.command.parameters.push({
            name: "",
            values: ""
        });
    };

    $scope.removeParameter = function(parameter){
        var index = $scope.component.command.parameters.indexOf(parameter);
        $scope.component.command.parameters.splice(index, 1);
    };

    $scope.close = function () {
        $modalInstance.close();
    };
};

iotController.controller('AccountCtrl', function($scope,
    $rootScope,
    $modal,
    $timeout,
    usersService,
    invitesService,
    accountsService,
    $filter,
    $window,
    ngTableParams,
    devicesService,
    componentsService,
    sessionService) {

    $scope.$parent.page = {
        menuSelected: "account",
        title : $rootScope.i18n.account.title
    };

    $scope.accountNameEdit = false;
    $scope.show_activation_code = false;
    $scope.showDetail = true;
    $scope.isOpen = { 0:true };
    $scope.users = [];
    $scope.selectedRole = $scope.selectedRole || {};
    $scope.roleEdit = {};
    $scope.editing = false;

    function processActivationCode (codeData) {
        if (codeData && codeData.activationCode) {
            $scope.account.activationCode = codeData.activationCode;
            $scope.account.timeLeft = codeData.timeLeft;
        } else {
            $scope.account.activationCode = $rootScope.i18n.account.regenerate;
            $scope.account.timeLeft = null;
        }
    }

    $scope.$watch(sessionService.getCurrentAccount, function(data){
        $scope.currentAccount = data;
        if(data && $scope.account){
            $scope.account.healthTimePeriod = ($scope.currentAccount.healthTimePeriod || 86400) / 24 / 60 / 60;
            devicesService.getTotal(function(data) {
                if(data && data.state) {
                    $scope.devicesCount = data.state.total;
                } else {
                    $scope.devicesCount = 0;
                }
            });
            $scope.getUsers();
            accountsService.getActivationCode($scope.currentAccount.id, function (err, res) {
                var result = null;
                if (!err && res) {
                    result = res;
                }
                processActivationCode(result);
            });
        } else {
            $scope.devicesCount = 0;
        }
    });

    $scope.account = {
        healthTimePeriodEdit: false,
        activationCode: $rootScope.i18n.account.regenerate,
        timeLeft: null,
        countDown: 0,
        hour: 0,
        minutes: 0,
        seconds: 0,
        isCodeActive: false
    };
    function getNowTime() {
        return Math.round((new Date().getTime()) / 1000);
    }
    function format (number) {
        return ("0" + number).slice(-2);
    }
    function counterDown() {
        $scope.account.countDown = $scope.account.timeLeft - getNowTime();
        if ($scope.account.countDown > 0) {
            $scope.account.hour =  format(~~($scope.account.countDown / 3600)) ; //date.getUTCHours();
            $scope.account.minutes = format(~~(($scope.account.countDown % 3600) / 60));
            $scope.account.seconds = format($scope.account.countDown % 60);
            $scope.account.isCodeActive = true;
            $timeout(counterDown, 1000);
        } else {
            $scope.account.hour =  format(0);
            $scope.account.minutes = format(0);
            $scope.account.seconds = format(0);
            $scope.account.isCodeActive = false;
        }
    }

    $scope.$watch('account.timeLeft', function (newTime) {
        if (angular.isNumber(newTime)) {
            $scope.account.countDown = newTime - getNowTime();
            counterDown();
        }
    });

    $scope.showUserRole = function(user) {
        return !user.accounts || !$scope.currentAccount?
            'user' : user.accounts[$scope.currentAccount.id];
    };

    $scope.isNotAdmin = function (user) {
        return ($scope.showUserRole(user) === 'user');
    };

    var isCurrentUserAdminForCurrentAccount = function(){
        return $scope.currentUser.accounts[$scope.currentAccount.id] &&
            $scope.currentUser.accounts[$scope.currentAccount.id].role === 'admin';
    };

    $scope.getUsers = function() {
        if(isCurrentUserAdminForCurrentAccount()) {
            usersService.getUsers(function (data) {
                data.forEach(function (u) {
                    u.role = $scope.showUserRole(u);
                    $scope.selectedRole[u.email] = u.role;
                });
                $scope.users = data;
                invitesService.getInvites(function (invites) {
                    invites.forEach(function (i) {
                        $scope.users.push({
                            email: i,
                            role: 'user',
                            verified: false
                        });
                    });
                    $scope.tableParams.reload();
                }, function (data) {
                    $scope.error = data;
                });
            }, function (data) {
                $scope.error = data;
            });
        }
    };

    var hasAccountOtherAdminThanCurrentUser = function() {
        return $scope.users.some(function otherAdminThanCurrentUser(user){
            return $scope.currentUser.email !==  user.email && user.role === 'admin';
        });
    };

    $scope.canLeaveAccount = function (){
        if(isCurrentUserAdminForCurrentAccount()) {
            return hasAccountOtherAdminThanCurrentUser();
        }
        return true;
    };

    $scope.roleChanged = function(email) {
        $scope.roleEdit[email] = true;
        $scope.editing = true;
    };

    $scope.exitRoleEdit = function(email) {
        $scope.roleEdit[email] = false;
        $scope.users = $scope.getUsers();
        $scope.editing = false;
    };

    $scope.confirmRoleEdit = function(user) {
        user.accounts[$scope.currentAccount.id] = $scope.selectedRole[user.email];
        usersService.updateUserAccounts(user,
            function(){
                $scope.exitRoleEdit(user.email);
            },
            function(data){
                $scope.roleEditError = JSON.stringify(data);
                $scope.exitRoleEdit(user.email);
            }
        );
    };
    /*jshint newcap: false */
    $scope.tableParams = new ngTableParams({
        page: 1,            // show first page
        count: 20
    }, {
        counts: [], // hide page counts control
        total: 10,  // value less than count hide pagination
        getData: function($defer, params) {
            // use build-in angular filter
            var filteredData = params.filter() ?
                $filter('filter')($scope.users, function(value){
                    var result = true;
                    var filters = params.filter();
                    if(filters.verified){
                        if($scope.showUserVerification(value).indexOf(filters.verified) === -1){
                            result = false;
                        }
                    }
                    if(filters.role){
                        if($scope.showUserRole(value).indexOf(filters.role) === -1){
                            result = false;
                        }
                    }
                    if(filters.email){
                        if(value.email.indexOf(filters.email.toString()) === -1){
                            result = false;
                        }
                    }
                    return result;
                }) : $scope.users;
            var orderedData = params.sorting() ?
                $filter('orderBy')(filteredData, params.orderBy()) :
                $scope.users;
            if(orderedData){
                params.total(orderedData.length); // set total for recalc pagination
                $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }
        }
    });
    /*jshint newcap: true */

    $scope.getComponents = function() {
        componentsService.getFullCatalog(function(data) {
            $scope.components = data;
            $scope.groupComponents($scope.groupedBy || 'dimension');
        }, function(data){
            $scope.error = data;
        });
    };

    $scope.expandAll = function(value, ev){
        if (ev) {
            ev.preventDefault();
            ev.stopPropagation();
        }
        Object.keys($scope.isOpen).forEach(function(n){
            $scope.isOpen[n]=value;
        });
    };

    $scope.groupComponents = function(group){
        $scope.componentsGroups = {};
        $scope.components.forEach(function(cmp){
            if(angular.isObject($scope.componentsGroups[cmp[group]])){
                $scope.componentsGroups[cmp[group]].push(cmp);
            } else {
                $scope.componentsGroups[cmp[group]] = [cmp];
            }
        });
        $scope.groupedBy = group;
    };

    $scope.showComponentDetails = function(component, mode){
        return $modal.open({
            templateUrl: 'public/partials/devices/componentDefinition.html',
            controller: ComponentDetailsModalInstanceCtrl,
            resolve: {
                component: function () {
                    return component;
                },
                newComponentCallback: function () {
                    return function(data) {
                        $scope.components.push(data);
                        $scope.groupComponents($scope.groupedBy);
                    };
                },
                mode: function(){
                    return mode;
                },
                currentUser: function(){
                    return $scope.$root.currentUser;
                },
                currentAccount: function(){
                    return $scope.currentAccount;
                }
            }
        });
    };

    $scope.addUser = function () {

        var modalInstance = $modal.open({
            templateUrl: 'public/partials/account/addUser.html',
            controller: 'InviteModalCtrl',
            resolve: {
                currentUser: function () {
                    return $scope.$root.currentUser;
                },
                users: function() {
                    return $scope.users;
                },
                deviceCount: function() {
                    return 0;
                },
                currentAccount: function() {
                    return $scope.currentAccount;
                }
            }
        });
        modalInstance.result.then(function () {
            $scope.getUsers();
        });
        return modalInstance;
    };

    $scope.deleteUser = function (user) {
        invitesService.delInvite(user.email, function() {
            $scope.getUsers();
        }, function(){
            $scope.getUsers();
        });
    };

    $scope.updateAccount = function(){
        accountsService.updateAccount($scope.currentAccount.id, $scope.currentAccount,
            function(){
                $scope.init();
            }, function(data, status) {
                if (data.message) {
                    $scope.error = data.message;
                } else {
                    $scope.error = status;
                }
            });
    };

    $scope.updateHealthTimePeriod = function(){
        $scope.currentAccount.healthTimePeriod = $scope.account.healthTimePeriod * 24 * 60 * 60;
        $scope.updateAccount();
    };

    $scope.init = function(){
        $scope.getCurrentUser();
        $scope.selectAccount($scope.currentAccount.id);
        $scope.accountNameEdit = false;
        $scope.account.healthTimePeriodEdit = false;
        $scope.account.healthTimePeriod = ($scope.currentAccount.healthTimePeriod || 86400) / 24 / 60 / 60;
    };

    $scope.refreshActivationCode  = function () {
        accountsService.refreshActivationCode($scope.currentAccount.id, function (err, data) {
            var result = null;
            if (!err && data) {
                result = data;
            }
            processActivationCode(result);
        });
    };

    $scope.editAccount = function(){
        $scope.accountNameEdit = true;
    };

    $scope.showDeleteAccount = function(){
        var modalInstance = $modal.open({
            templateUrl: 'public/partials/account/deleteAccount.html',
            controller: 'InviteModalCtrl',
            resolve: {
                currentAccount: function () {
                    return $scope.currentAccount;
                },
                users: function() {
                    return $scope.users;
                },
                deviceCount: function() {
                    return $scope.devicesCount;
                }
            }
        });
        modalInstance.result.then(function() {
            $scope.getCurrentUser();
        });
        return modalInstance;
    };

    $scope.showLeaveAccount = function(){
        var modalInstance = $modal.open({
            templateUrl: 'public/partials/account/leaveAccount.html',
            controller: 'InviteModalCtrl',
            resolve: {
                currentAccount: function () {
                    return $scope.currentAccount;
                },
                users: function() {
                    return $scope.users;
                },
                deviceCount: function() {
                    return $scope.devicesCount;
                }
            }
        });

        return modalInstance;
    };

    $scope.attributesSavedSuccessfully = false;
    $scope.show = {
        attributes: false,
        datail: false
    };

    $scope.saveAttributes = function(){
        accountsService.updateAccount($scope.currentAccount.id, $scope.currentAccount, function () {
            $scope.show.attributes = false;
            $scope.attributesSavedSuccessfully = true;
        }, function(data){
            $scope.error = data.message || data;
            $scope.attributesSavedSuccessfully = false;
        });
    };

    $scope.cancel = function(){
        $window.location.reload();
    };

    $scope.getSensorHealthStatus = function (account) {
        if (account.settings) {
            if (account.settings.trackSensorHealth === true) {
                return $scope.i18n.account.sensor_health_report.enabled;
            }
            return $scope.i18n.account.sensor_health_report.disabled;
        } else {
            return $scope.i18n.account.sensor_health_report.disabled;
        }
    };
});
