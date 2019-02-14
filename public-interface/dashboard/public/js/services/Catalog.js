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
iotServices.factory('Catalog', ['$http', 'utilityService','sessionService',
    function($http,
        utilityService, sessionService) {

        function Catalog () {
            this.id = null;
            this.dataType = null;
            this.type = null;
            this.measureunit= null;
            this.display = null;
        }
        function CatalogOptions() {
            this.url = '/cmpcatalog/';
            this.params = {
                "_" : utilityService.timeStamp()
            };
        }
        function GetCatalog (){
            angular.copy(new CatalogOptions(), this);

            this.url = this.url;
            this.method = 'GET';
            return this;

        }
        function GetComponentById (id){
            angular.copy(new CatalogOptions(), this);

            this.url = this.url + id;
            this.method = 'GET';
            return this;

        }
        function request (options, callback) {
            sessionService.addAccountIdPrefix(options.url)
                .then(function(url) {
                    options.url = url;
                    $http(options)
                        .success(function (data) {
                            if (callback) {
                                callback(data);
                            }
                        });
                });
        }

        Catalog.prototype = {
            setData: function (ruleData) {
                angular.extend(this, ruleData);
            },
            getAll: function () {
                var me = this;
                var opt = new GetCatalog();
                request(opt, function(data){
                    me.setData(data);
                });
            },
            getComponentById: function (id, callback) {
                var me = this;
                var opt = new GetComponentById(id);
                request(opt, function(data){
                    me.setData(data);
                    if (callback) {
                        callback(me);
                    }
                });
            }
        };
        return Catalog;
    }]);