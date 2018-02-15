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
iotController.controller('EditAlertCtrl', function($scope, $routeParams, $location, alertsService, rulesService){
    var i18n = $scope.$parent.i18n;
    $scope.$parent.page = {
        menuSelected: 'alerts',
        title: i18n.alerts.title
    };
    $scope.priorities = {
        high: 'High',
        medium: 'Medium',
        low: 'Low'
    };
    $scope.statuses = [{name: 'New'}, {name: 'Open'}, {name: 'Closed'}];

    $scope.statusEdit = false;

    $scope.alert = null;
    $scope.error = null;
    $scope.currentComment = null;
    $scope.addingComment = false;
    $scope.comments = [];

    var getCurrentStatus = function(){
        return $scope.statuses.filter(function(s) { return s.name === $scope.alert.status;})[0];
    };

    alertsService.getAlert($routeParams.alertId, function(data){
        $scope.error = null;
        $scope.alert = data;
        rulesService.getRuleById($scope.alert.ruleId, function(data){
            $scope.alert.rule = data;
        });
        $scope.comments = $scope.alert.comments ? $scope.alert.comments: [];
        $scope.currentStatus = getCurrentStatus();
    }, function(){
        $scope.error = i18n.alerts.errors.loadAlerts;
    });
    
    $scope.addComment = function(gc){
        if (gc !== undefined && gc !== null && gc !== '') {
            var comment = {
                text: gc,
                timestamp: Date.now(),
                user: $scope.$root.currentUser.email
            };
            $scope.comments.push(comment);
            $scope.currentComment = null;
            $scope.addingComment = false;

            var options = {
                alertId: $scope.alert.alertId,
                comments: [comment]
            };
            alertsService.addComments(options, function(){}, function(){});
        }
    };

    $scope.parseTimestamp = function(ts){
        return moment(ts).fromNow();
    };

    $scope.changeStatus = function(){
        $scope.statusEdit = false;
        $scope.error = null;
        var originalStatus = getCurrentStatus();

        var updateStatusFn = alertsService.reset;
        var options = {
            alert: $scope.alert,
            scope: $scope
        };

        if ($scope.currentStatus.name !== $scope.statuses[2].name /*[2] = CLOSED*/) {
            options.newStatus = $scope.currentStatus.name;
            updateStatusFn = alertsService.updateStatus;
        }

        updateStatusFn(options, function(){

        }, function(){
            $scope.currentStatus = originalStatus;
            $scope.error = i18n.alerts.errors.updateAlerts;
        });
    };

    $scope.close = function(){
        $location.path('/alerts');
    };
});