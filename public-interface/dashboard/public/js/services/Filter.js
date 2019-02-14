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
iotServices.factory('Filter', [function() {
    function Filter () {
        this.devices = {
            status: {
                "operator": "eq",
                "value": "active"
            },
            name: {
                "operator": "like",
                "value": null
            },
            tags: {
                "operator": "in",
                value: []
            },
            properties: {

            }
        };
        this.chart = {
            devices: {
            }
        };
    }
    Filter.prototype = {
        setName: function (name) {
            if (angular.isArray(name)) {
                this.devices.name.value = name[0];
                return;
            } else if (name){
                this.devices.name.value = name;
            }
        },
        getName: function(){
            return this.devices.name.value;
        },
        setTags: function (tags) {
            if (angular.isArray(tags)) {
                this.devices.tags.value = tags;
            }
        },
        getTags: function () {
            return this.devices.tags.value;
        },
        setDeviceId: function (dids) {
            var i,l;
            if (angular.isArray(dids)) {
                l = dids.length;
                for (i = 0; i < l; ++i) {
                    this.chart.devices[dids[i]] = true;
                }
            }
        },
        isDidChoose : function (did) {
            return this.chart.devices[did];
        },
        getDevicesId: function () {
            /**
             * It is filter the deviceid with true value
             */
            var me = this;
            var didChosed = Object.keys(me.chart.devices).filter(function(deviceId){
                return me.chart.devices[deviceId];
            });
            return didChosed;
        }
    };
    return Filter;
}]);