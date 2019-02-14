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
var ConfirmChangeRuleStatusModalInstanceCtrl = function($scope, $modalInstance, rule, newStatus){
    $scope.rule = rule;
    $scope.newStatus = newStatus;

    $scope.confirm = function () {
        $modalInstance.close(true);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
};

iotController.controller('ListRulesCtrl', function($scope,
    $rootScope,
    $location,
    $filter,
    $modal,
    $q,
    ngTableParams,
    rulesService,
    sessionService,
    orderingService,
    filteringService,
    ngProgress,
    utilityService) {


    var i18n = $scope.$parent.i18n;

    // init variables
    $scope.$parent.page = {
        menuSelected: "rules",
        title : i18n.rules.title
    };
    $scope.rules = [];
    $scope.priorities = {
        high: 'High',
        medium: 'Medium',
        low: 'Low'
    };
    $scope.statuses = {
        draft: 'Draft',
        deleted: 'Deleted',
        active: 'Active',
        onhold: 'On-hold',
        archived: 'Archived'
    };
    $scope.error = null;
    $scope.priorityLevel = utilityService.convertToNgOption(i18n.rules.priority_level);

    $scope.getTitlePriority = function(prioridad)  {
        var p = utilityService.getObjectKey(prioridad,
            $scope.priorityLevel,
            "name");
        return p.name;
    };
    $scope.isPriorityHigh = function (priority) {
        return (priority === "High");
    };
    $scope.isPriorityLow = function (priority) {
        return (priority === "Low");
    };
    $scope.isPriorityMedium = function(priority) {
        return (priority === "Medium");
    };
    $scope.isDraftRule = function(status) {
        return (status ===  $scope.statuses.draft);
    };
    /*jshint newcap: false */
    $scope.tableRules = new ngTableParams({
        page: 1,            // show first page
        count: 10           // count per page
    }, {
        counts: [],
        getData: function($defer, params) {
            $scope.error = null;
            $scope.$watch(sessionService.getCurrentAccount, function(data) {
                if (data) {
                    rulesService.getRules(function (data) {
                        $scope.rules = data;

                        var orderedData = orderingService.orderBy(data, params);
                        orderedData = filteringService.filterRulesBy(orderedData, params);

                        $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                        params.total(orderedData.length);

                    }, function (data, status) {
                        if(status !== 429) {
                            $scope.error = $rootScope.i18n.rules.errors.load;
                        } else {
                            $scope.error = data.message || data;
                        }
                        ngProgress.complete();
                    });
                }
            });
        }
    });
    $scope.refreshRulesView = function(ruleId, newStatus) {
        $scope.tableRules.data.forEach(function(rule){
            if(rule.externalId === ruleId) {
                rule.status = newStatus.status;
            }
        });
    };
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
        return function(rule, newStatus){
            $scope.error = null;
            var changeRuleStatusModalInstance = $modal.open({
                templateUrl: 'public/partials/rules/confirm-change-rule-status.html',
                controller: ConfirmChangeRuleStatusModalInstanceCtrl,
                resolve: {
                    rule: function(){
                        return rule;
                    },
                    newStatus: function(){
                        return newStatus;
                    }
                }
            });
            changeRuleStatusModalInstance.result.then(function(){
                callback(rule, newStatus);
            }, function () {

            });

            return changeRuleStatusModalInstance;
        };
    };

    $scope.changeRuleStatus = createModal(function(rule, newStatus){
        var ruleStatus = {
            status: newStatus
        };
        rulesService.updateRuleStatus(rule.externalId, ruleStatus, function(){
            $scope.refreshRulesView(rule.externalId, ruleStatus);
        }, function(){
            $scope.error = $rootScope.i18n.rules.errors.update;
        });
    });

    $scope.deleteDraft = createModal(function(rule){
        rulesService.deleteDraft(rule.externalId, function(){
            $scope.tableRules.reload();
        }, function(){
            $scope.error = $rootScope.i18n.rules.errors.deleteDraft;
        });
    });

    $scope.deleteRule = createModal(function(rule){
        rulesService.deleteRule(rule.externalId, function(){
            $scope.tableRules.reload();
        }, function(){
            $scope.error = $rootScope.i18n.rules.errors.deleteRule;
        });
    });

    $scope.cloneExistingRule = function(externalRuleId) {
        rulesService.cloneExistingRule(externalRuleId, function(){
            $scope.tableRules.reload();
        }, function(){
            $scope.error = $rootScope.i18n.rules.errors.cloneRule;
        });
    };

    $scope.addRule = function(){
        $location.path('/rules/add');
    };
});
