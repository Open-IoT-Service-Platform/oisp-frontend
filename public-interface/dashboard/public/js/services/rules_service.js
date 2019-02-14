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
iotServices.factory('rulesService', ['$http',
    'utilityService', 'sessionService', function($http,
        utilityService, sessionService){


        var _data = {
            rule : null,
            ruleLists : []
        };
        return {
            getRules: function(successCallback, errorCallback){
                sessionService.addAccountIdPrefix('/rules')
                    .then(function(url) {
                        $http({
                            method: 'GET',
                            url: url,
                            params: {
                                "_": utilityService.timeStamp()
                            }
                        }).success(function (data, status) {
                            _data.ruleLists = data;
                            if (successCallback) {
                                successCallback(data, status);
                            }
                        }).error(errorCallback);
                    });
            },
            getRuleById: function(ruleId, successCallback, errorCallback){
                sessionService.addAccountIdPrefix('/rules/' + ruleId)
                    .then(function(url) {
                        $http({
                            method: 'GET',
                            url: url,
                            params: {
                                "_": utilityService.timeStamp()
                            }
                        }).success(function (data, status) {
                            _data.ruleLists = data;
                            if (successCallback) {
                                successCallback(data, status);
                            }
                        }).error(errorCallback);
                    });
            },
            updateRuleStatus: function(ruleId, ruleStatus, successCallback, errorCallback){
                sessionService.addAccountIdPrefix('/rules/' + ruleId + '/status')
                    .then(function(url) {
                        var options = {
                            method: 'PUT',
                            url: url,
                            data: ruleStatus
                        };
                        $http(options).success(function (data, status) {
                            successCallback(data, status);
                        }).error(errorCallback);
                    });
            },
            deleteDraft: function(ruleId, successCallback, errorCallback){
                sessionService.addAccountIdPrefix('/rules/draft/' + ruleId)
                    .then(function(url) {
                        var options = {
                            method: 'DELETE',
                            url: url
                        };
                        $http(options).success(successCallback).error(errorCallback);
                    });
            },
            deleteRule: function(ruleId, successCallback, errorCallback){
                sessionService.addAccountIdPrefix('/rules/delete_rule_with_alerts/' + ruleId)
                    .then(function(url) {
                        var options = {
                            method: 'DELETE',
                            url: url,
                        };
                        $http(options).success(successCallback).error(errorCallback);
                    });
            },
            cloneExistingRule: function(ruleId, successCallback, errorCallback){
                sessionService.addAccountIdPrefix('/rules/clone/' + ruleId)
                    .then(function(url) {
                        var options = {
                            method: 'POST',
                            url: url
                        };
                        $http(options).success(successCallback).error(errorCallback);
                    });
            }
        };
    }]);