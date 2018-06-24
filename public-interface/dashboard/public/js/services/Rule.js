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

"use strict";

iotServices.factory('Rule', ['$http', 'utilityService','sessionService',
                                       function($http,
                                               utilityService, sessionService) {

    function Rule () {
        this.id = null;
        this.name =null;
        this.description = null;
        this.priority =  null;
        this.type = null;
        this.status = 'Draft';
        this.synchronizationStatus = "NotSync";
        this.resetType = 'Manual';
        this.actions = [{
            "type": "",
            "target": []
            }
        ];
        this.population = {
            name : null,
            ids: [],
            tags: [],
            attributes: null
        };
        this.conditions =  {
            operator: null,
            values:[]
        };
    }
    function RulesOptions() {
        this.url = '/rules/';
        this.params = {
                        "_" : utilityService.timeStamp()
                      };
    }
    function GetRulebyIdOption (id){
        angular.copy(new RulesOptions(), this);
        this.url = this.url + id;
        this.method = 'GET';
        return this;
    }
    function PutRuleDraft (data) {
        angular.copy(new RulesOptions(), this);
        this.url = this.url + "draft";
        this.method = 'PUT';
        this.data = data;
    }
    function PostRule (data) {
        angular.copy(new RulesOptions(), this);
        this.url = this.url;
        this.method = 'POST';
        this.data = data;
    }
    /*function PutRule (data) {
        angular.copy(new RulesOptions(), this);
        this.url = this.url + data.externalId;
        this.method = 'PUT';
        this.data = data;
    }*/
    function DeleteRuleDraft (data) {
        angular.copy(new RulesOptions(), this);
        this.url = this.url + "draft/" + data.id;
        this.method = 'DELETE';
    }
    function UpdateRuleStatus (data, status) {
        angular.copy(new RulesOptions(), this);
        this.url = this.url + data.externalId + "/status/";
        this.method = 'PUT';
        this.data = {
            "status": status
        };
        delete this.params;
    }
    function request (options, callback, errCallback) {
        sessionService.addAccountIdPrefix(options.url)
        .then(function(url) {
            options.url = url;
            $http(options)
                .success(function (data) {
                    if (callback) {
                        callback(data);
                    }
                }).error(function (data) {
                    if (errCallback) {
                        errCallback(data);
                    }
                });
        });
    }
    Rule.prototype = {
        setErrorCallback: function (callback) {
          if (typeof callback === 'function') {
              this.errorCallback = callback;
          }
        },
        setData: function (ruleData) {
            angular.extend(this, ruleData);
        },
        getMailsAction: function () {
             var mails = [],
                 length = this.actions.length,
                 i,
                 item;
             if (angular.isArray(this.actions)) {
                 for (i = 0; i < length; ++i) {
                     item = this.actions[i];
                     if (item.type === "mail") {
                         mails = item.target;
                     }
                 }
             } else if (angular.isObject(this.actions))  {
                 item = this.actions;
                 if (item.type === "mail") {
                     mails = item.target;
                 }
             }
            return mails;
        },
        isMailAtAction: function (email) {
            var result = false,
                alReady = this.getMailsAction();
            for (var i = 0; i < alReady.length; ++i) {
                var myeMail = alReady[i];
                if (myeMail === email) {
                   result = true;
                   break;
                }
            }
            return result;
        },
        setPopulation: function (data) {
            this.population.ids = data.devices;
            this.population.tags = data.tags;
            this.population.name = data.deviceName;
        },
        getPopulation: function (){
            return this.population;
        },
        setCondition: function (data){
          this.conditions = data;
        },
        getCondition: function () {
          return this.conditions;
        },
        getConditionsLength: function(){
            return this.conditions.values.length;
        },
        canConditionsBeEdited: function(){
            var l = this.conditions.values.length,
                i = 0,
                ret = true;
            for (; i < l; i++) {
                if (this.conditions.values[i].type === 'automatic') {
                    ret = false;
                    break;
                }
            }

            return ret;
        },
        setType : function (type) {
            this.type = type;
        },
        isValid : function () {
                return true;
        },
        getById : function (id) {
           var me = this;
           var opt = new GetRulebyIdOption(id);
           request(opt, function(data) {
               me.setData(data);
           }, me.errorCallback);
        },
        draft: function () {
            var me = this;
            var opt = new PutRuleDraft(this);
            request(opt, function(data){
                 me.setData(data);
            });
        },
        isDraft: function (){
           return (this.status === 'Draft');
        },
        delete: function() {
            var me = this;
            var opt = new DeleteRuleDraft(this);
            request(opt, function(){
                me.setData(new Rule());
            }, me.errorCallback);
        },
        prepareForSave: function (apply) {
            var me = this;
            delete me.owner;
            delete me.creationDate;
            delete me.id;
            delete me.lastUpdateDate;
            delete me.accountId;
            delete me.naturalLanguage;
            delete me.domainId;
            if (!me.description) {
                delete me.description;
            }

            Object.keys(me.population).forEach(function(o){
               if (angular.isArray(me.population[o])){
                   if (me.population[o].length === 0) {
                       delete me.population[o];
                   }
               }
            });
            if (apply && (me.population.tags || me.population.name)) {
                delete me.population.ids;
            }
        },
        saveAs: function (status, apply, callback) {
            var me = this;
            me.prepareForSave(apply);

            var opt = new PostRule(this);

            if (me.externalId && !me.isDraft()) {
                var params = new UpdateRuleStatus(this, 'Archived');
                request(params, function(){}, me.errorCallback);
                delete opt.data.externalId;
            }

            me.status = status;

            request(opt, function(data){
                me.setData(data);
                if (callback) {
                    callback();
                }
            }, me.errorCallback);
        }
    };
    return Rule;
}]);
