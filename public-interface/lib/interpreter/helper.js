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

/*jshint loopfunc: true */

'use strict';

var isObject = function (obj) {
    return (Object.prototype.toString.call(obj) === '[object Object]');
};

exports.isObject = isObject;

exports.asAppId = function(entity){
    if(entity.id){
        entity.id = entity.id.toString();
    }
    return entity;
};

exports.removeDbId = function(entity){
    delete entity._id;
    return entity;
};

var inverse = function(lookUpTable){
    var ret = {},
        current;
    for(var i in lookUpTable){
        if(lookUpTable.hasOwnProperty(i)){
            current = lookUpTable[i];
            if(isObject(current)){
                ret[i] = inverse(current);
            } else if(Array.isArray(current)){
                ret[i] = [inverse(current[0])];
            } else {
                ret[current] = i;
            }
        }
    }

    return ret;
};

exports.inverse = inverse;

var translate = function (lookUpTable, entity, idProcessor) {
    var ret = {},
        currentTable;
    for (var i in entity) {
        if (entity.hasOwnProperty(i)) {
            currentTable = lookUpTable[i];
            if (!currentTable && !Array.isArray(entity[i])) {
                ret[i] = entity[i];
            } else {
                if (isObject(currentTable) && isObject(entity[i])) {
                    ret[i] = translate(currentTable, entity[i], idProcessor);
                } else {
                    if (Array.isArray(currentTable) && Array.isArray(entity[i])) {
                        ret[i] = entity[i].map(function (e) {
                            if (isObject(e)) {
                                return translate(currentTable[0], e, idProcessor);
                            } else {
                                return e;
                            }
                        });
                    } else if (Array.isArray(currentTable) && isObject(entity[i])) {
                        ret[i] = entity[i];
                    } else {
                        ret[currentTable || i] = entity[i];
                    }
                }
            }
        }
    }
    if (idProcessor) {
        ret = idProcessor(ret);
    }
    return ret;
};

exports.translate = translate;

exports.mapAppResults = function(result, interpreter, resultCallback) {
    var mappedResult = null;
    if (result) {
        if (Array.isArray(result)) {
            mappedResult = result.map(function(item) {
                return interpreter.toApp(item);
            });
        } else {
            mappedResult = interpreter.toApp(result);
        }
    }
    if (resultCallback) {
        resultCallback(null, mappedResult);
    } else {
        return mappedResult;
    }
};
