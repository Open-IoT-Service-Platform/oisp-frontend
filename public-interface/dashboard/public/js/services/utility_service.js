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
iotServices.factory('utilityService',  function() {

    function timeIntamp() {
        return Math.round (new Date().getTime());
    }
    return {
        "timeStamp" : timeIntamp,
        "noneCacheConfig" : function () {
            return {params: {'_': timeIntamp()}};
        },
        "addToList": function addTo (toAdd, list) {
            var l = list.length;
            for (var i = 0; i < l; ++i) {
                var data = list[i];
                if (data.id === toAdd.id) {
                    break;
                }
            }
            if (i === l) {
                list.push(toAdd);
            }
            return list;
        },
        "removeFromList": function remFrom (toRem, list) {
            var l = list.length;
            for (var i = 0; i < l; ++i) {
                var data = list[i];
                if (data.id === toRem.id) {
                    list.splice(i, 1);
                    break;
                }
            }
            return list;
        },
        /**
         * @Description convert to object for NgOption.
         * @param dataArray {"AAKey", "textToDisplay"}
         * @returns {Array} {id: dataArrayIndex, text: dataArray[index][AAkey]
         */
        convertToNgOption: function (dataArray) {
            var a = [];
            var i,
                l = dataArray.length;
            for (i = 0; i < l ; ++i) {
                var value = dataArray[i];
                var key = Object.keys(value)[0] ;
                a.push({'id': i,
                    'text': value[key],
                    'key': key
                });
            }
            return a;
        },
        getNgOptionFromAAkey: function (aakey, dataArray) {
            var i,
                l = dataArray.length;
            for (i = 0; i < l ; ++i) {
                var value = dataArray[i];
                if (aakey === value.key ) {
                    return value;
                }
            }
            return null;
        },
        converFromSeconds: function(seconds){
            var keys = [
                    {key: 'w', baseline: 604800},
                    {key: 'd', baseline: 86400},
                    {key: 'h', baseline: 3600},
                    {key: 'm', baseline: 60},
                    {key: 's', baseline: 1},
                ],
                r = {key: 's', value: 0},
                rest = -1,
                i = 0,
                length = keys.length;
            for(; i < length; i++){
                rest = seconds % keys[i].baseline;
                if (rest === 0) {
                    r.key = keys[i].key;
                    r.value = seconds / keys[i].baseline;
                    break;
                }
            }

            return r;
        },
        getPeriodToSeconds: function (id, num){
            /*{"s": "Seconds"},
            {"m": "Minutes"},
            {"h": "Hours"},
            {"d": "Days"},
            {"w": "Weeks"}*/
            var total = 0;
            switch(id) {
            case 's':
                total = 1;
                break;
            case 'm':
                total = 60;
                break;
            case 'h':
                total = 3600;
                break;
            case 'd':
                total = 86400;
                break;
            case 'w':
                total = 604800;
                break;
            }
            return total * num;
        },
        getObjectKey: function  (key, list, prop) {
            var a, l = list.length;
            for (var i=0; i < l;++i){
                var o =list[i];
                if (o[prop] === key) {
                    a = o;
                    break;
                }
            }
            return a;
        }

    };
});