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

iotController.controller('DashboardCtrl', function($scope, $location, $rootScope, $route, $window,
    loginService, pollerService, alertsService, usersService,
    invitesService, accountsService, sessionService) {
    $scope.snap_opts = {
        maxPosition: 150,
        minPosition: -150,
        touchToDrag: false
    };

    var trackSensorHealthDisabled = {
        text:'Off (default)',
        value: false
    };

    var trackSensorHealthEnabled = {
        text:'On',
        value: true
    };

    $scope.availableTrackSensorHealthOptions = [
        trackSensorHealthDisabled,
        trackSensorHealthEnabled
    ];

    $scope.account = {
        name: '',
        trackSensorHealth: trackSensorHealthDisabled
    };

    $rootScope.$on("$locationChangeSuccess", function(event, next) {
        $scope.creatingAccount = next.indexOf('/account/add') > -1;
    });

    $scope.getCurrentUser = function(done) {
        loginService.currentUser(
            function(data){
                $scope.$root.currentUser = data;
                if(!$scope.userAccounts){
                    $scope.userAccounts = {};
                }
                if(data.accounts){
                    Object.keys(data.accounts).forEach(function(acc){
                        $scope.userAccounts[acc] = data.accounts[acc];
                    });
                }
                if(!$scope.currentAccount && !$scope.creatingAccount){
                    if(!data.accounts || Object.keys(data.accounts).length === 0){
                        $scope.createAccount();
                    } else if(data.accounts && Object.keys(data.accounts).length > 0) {
                        $scope.selectAccount(Object.keys(data.accounts)[0]);
                    }
                }

                $scope.getUserInvites();
                pollerService.startPolling('invitesService', $scope.getUserInvites, 120000);
                if(done){
                    done(data);
                }
            },
            function(data){
                $scope.error = data.message || data;
            }
        );
    };
    $scope.getCurrentUser();

    $scope.ChangeEvent = function () {
    };

    $scope.BeforeChangeEvent = function () { };

    $scope.intro_options = {
        steps:[
            {
                element: '#step1',
                intro: "This is a sample toolTip."
            }
        ],
        showStepNumbers: false,
        exitOnOverlayClick: true,
        exitOnEsc:true,
        disabledClass: "btn-disabled",
        nextLabel: 'Next',
        nextClassName: 'btn btn-primary',
        prevLabel: 'Previous',
        prevClassName: 'btn btn-info',
        skipLabel: 'Skip',
        skipClassName: 'btn btn-default pull-left',
        doneLabel: 'Got It !'
    };

    var alertStatuses = {new: 'New', open: 'Open'};
    $scope.unreadAlerts = [];
    $scope.alertsSummary = alertsService.data;

    $scope.invites = [];
    $scope.getUserInvites = function(){
        if($scope.$root.currentUser && $scope.$root.currentUser.email){
            invitesService.getUserInvites($scope.$root.currentUser.email, function(data){
                if(data && data.length>0){
                    data.forEach(function(i){
                        if(!$scope.invites.some(function(j){ return j._id=== i._id; })){
                            $scope.invites.push(i);
                        }
                    });
                    $scope.invites = $scope.invites.filter(function(i){
                        return data.some(function(j){
                            return j._id === i._id;
                        });
                    });
                } else {
                    $scope.invites.length=0;
                }
            }, function(data){
                $scope.error = data.message || data;
            });
        }
    };

    usersService.getUserSettings(null, 'global', function(data){
        if(data && data[0]){
            $scope.dashboardSetting = data[0];
            if($scope.userAccounts && $scope.userAccounts[$scope.dashboardSetting.value.currentAccount]){
                $scope.selectAccount($scope.dashboardSetting.value.currentAccount);
            }
        } else {
            var setting = {
                value: { currentAccount: null},
                public: false
            };
            usersService.addUserSettings(null, 'global', setting, function(data){
                $scope.dashboardSetting = data;
            }, function(data){
                $scope.error = data.message || data;
            });
        }
    }, function() {
        usersService.addUserSettings(null, 'global', { currentAccount: null }, function(data){
            $scope.dashboardSetting = data;
        }, function(data){
            $scope.error = data.message || data;
        });
    });

    $scope.$on('$viewContentLoaded', function(){
        $scope.$watch(sessionService.getCurrentAccount, function(data){
            $scope.$root.currentAccount = data;
            if(data){
                pollerService.startPolling('dashboardAlertsService', alertsService.getUnreadAlerts, 60000);
            } else {
                pollerService.stopPolling('dashboardAlertsService');
            }
        });
    });
    $scope.$on('$destroy', function(){
        pollerService.stopPolling('dashboardAlertsService');
        pollerService.stopPolling('invitesService');
    });

    $scope.$watch('alertsSummary.unread', function(alerts){
        $scope.unreadAlerts = alerts;
    }, true);

    var removeReadAlerts = function(givenAlert){
        $scope.unreadAlerts = $scope.unreadAlerts.filter(function(ua){
            return ua.alertId !== givenAlert.alertId;
        });
    };

    var goToDetail = function(givenAlert){
        return function(){
            $location.path('/alerts/edit/' + givenAlert.alertId);
        };
    };

    $scope.changeAlertStatus = function(givenAlert){
        var options = {
            alert: givenAlert,
            newStatus: alertStatuses.open,
            scope: $scope
        };
        alertsService.updateStatus(options,
            goToDetail(givenAlert),
            goToDetail(givenAlert));
    };

    $scope.$on('event:alert-status-changed', function(event, data) {
        var alert = data.alert,
            newStatus = data.newStatus;

        if (alert !== undefined && newStatus !== undefined) {
            if (newStatus === alertStatuses.new) {
                $scope.unreadAlerts.push(alert);
            } else {
                removeReadAlerts(alert);
            }
        }
    });

    $scope.addAccount = function () {
        $scope.error=null;
        var newAccount = {
            name: $scope.account.name,
            settings: {
                trackSensorHealth: $scope.account.trackSensorHealth.value
            }
        };
        accountsService.addAccount(newAccount,
            function(data){
                loginService.refreshToken(function(jwt) {
                    sessionService.setJwt(jwt.token);
                    $scope.getCurrentUser(function(){
                        $scope.selectAccount(data.id);
                        $location.path('/');
                        $route.reload();
                    });
                },function(error){

                    $scope.error = error;
                });
            }, function(error){
                $scope.error = error;
            });
    };

    $scope.selectAccount = function(key){
        if ($scope.dashboardSetting) {
            $scope.dashboardSetting.value = { currentAccount: key };

            usersService.updateUserSetting(null, 'global', $scope.dashboardSetting.id,
                $scope.dashboardSetting,
                function () {
                }, function (data, status) {
                    if(status === 429) {
                        $scope.error = data.message || data;
                    }
                });
        }

        if(key && (!$scope.$root.currentAccount || key !== $scope.$root.currentAccount.id)){
            accountsService.getAccount(key, function(data){
                sessionService.setCurrentAccount(data);
                $route.reload();
            }, function(data){
                $scope.error = data;
            });
        }
    };

    $scope.createAccount = function(){
        $scope.creatingAccount = true;
        if($scope.$root.currentAccount){
            $scope.prevAccount = $scope.$root.currentAccount.id;
        }
        $scope.selectAccount(null);
        $location.path('account/add');
    };

    $scope.cancel = function(){
        if($scope.prevAccount){
            $scope.selectAccount($scope.prevAccount);
            $scope.prevAccount = null;
            $location.path('/');
        }
    };

    $scope.changeInviteStatus = function(inviteId, accept){
        invitesService.updateUserInvite(inviteId, { "accept": accept }, function(data){
            loginService.refreshToken(function(jwt) {
                sessionService.setJwt(jwt.token);
                $scope.getCurrentUser(function() {
                    $scope.getUserInvites();
                    if(accept) {
                        $location.path('/');
                        $scope.selectAccount(data.domainId);
                    }
                    $route.reload();
                });
            },function(e){

                $scope.error = e;
            });
        }, function(data, status){
            $scope.getUserInvites();
            $scope.error = status;
        });
    };
});