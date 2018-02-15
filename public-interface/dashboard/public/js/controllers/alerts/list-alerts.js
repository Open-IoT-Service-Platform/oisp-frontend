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
var ConfirmChangeAlertStatusModalInstanceCtrl = function($scope, $modalInstance, alert, newStatus){
    $scope.alert = alert;
    $scope.newStatus = newStatus;

    $scope.confirm = function () {
        $modalInstance.close(true);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
};

iotController.controller('ListAlertsCtrl', function($scope,
                                                    $routeParams,
                                                    $location,
                                                    $filter,
                                                    $modal,
                                                    $q,
                                                    alertsService,
                                                    orderingService,
                                                    filteringService,
                                                    sessionService,
                                                    ngTableParams) {


    var i18n = $scope.$parent.i18n;
    $scope.$parent.page = {
        menuSelected: 'alerts',
        title: i18n.alerts.title
    };

    $scope.statuses = {
        new: 'New',
        open: 'Open',
        closed: 'Closed'
    };

    $scope.priorities = {
        high: 'High',
        medium: 'Medium',
        low: 'Low'
    };

    $scope.alerts = [];
    $scope.error = null;

    /*jshint newcap: false */
    $scope.tableAlerts = new ngTableParams({
        page: 1,            // show first page
        count: 10           // count per page
    }, {
        counts: [],
        getData: function($defer, params) {
            $scope.error = null;
            $scope.$watch(sessionService.getCurrentAccount, function(data) {
                if (data) {
                    alertsService.getAlerts(function(data){
                        $scope.alerts = data;

                        if ($routeParams.filter) {
                            params.filter().status = [$routeParams.filter];
                            delete $routeParams.filter;
                        }

                        var orderedData = orderingService.orderBy(data, params);
                        orderedData = filteringService.filterRulesBy(orderedData, params);

                        $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                        params.total(orderedData.length);

                    }, function(){
                        $scope.error = i18n.alerts.errors.loadAll;
                    });
                }
            });
        }
    });
    /*jshint newcap: true */
    var filteringWith = function(object){
        var filters = [];
        Object.keys(object).forEach(function(k){
            filters.push({id: object[k], title: object[k]});
        });

        return function(){
            var def = $q.defer();
            def.resolve(filters);

            return def;
        };
    };

    $scope.getStatusesToFilterWith = filteringWith($scope.statuses);

    $scope.getPrioritiesToFilterWith = filteringWith($scope.priorities);

    var createModal = function(callback){
        return function(alert, newStatus){
            $scope.error = null;
            var changeRuleStatusModalInstance = $modal.open({
                templateUrl: 'public/partials/alerts/confirm-change-alert-status.html',
                controller: ConfirmChangeAlertStatusModalInstanceCtrl,
                resolve: {
                    alert: function(){
                        return alert;
                    },
                    newStatus: function(){
                        return newStatus;
                    }
                }
            });
            changeRuleStatusModalInstance.result.then(function(){
                callback(alert, newStatus);
            }, function () {

            });

            return changeRuleStatusModalInstance;
        };
    };

    $scope.changeStatus = createModal(function(alert, newStatus){
        var updateStatusFn = alertsService.reset;
        var options = {
            alert: alert,
            scope: $scope
        };

        if (newStatus !== $scope.statuses.closed) {
            options.newStatus = newStatus;
            updateStatusFn = alertsService.updateStatus;
        }

        updateStatusFn(options, function(){
            $scope.tableAlerts.reload();
        }, function(){
            $scope.error = i18n.alerts.errors.updateAlerts;
        });
    });

    var goToDetails = function(givenAlert){
        $location.path('/alerts/edit/' + givenAlert.alertId);
    };

    $scope.openDetails = function(givenAlert){
        if (givenAlert.status === $scope.statuses.new) {
            // change to open status
            var options = {
                alert: givenAlert,
                newStatus: $scope.statuses.open,
                scope: $scope
            };

            alertsService.updateStatus(options, function(){
                goToDetails(givenAlert);
            }, function(){
                goToDetails(givenAlert);
            });
        } else {
            goToDetails(givenAlert);
        }
    };

    $scope.deleteAlert = function(alert){
        alertsService.deleteAlert(alert.alertId, function(){
            $scope.tableAlerts.reload();
        }, function(){
            $scope.error = i18n.alerts.errors.deleteAlert;
        });
    };
});