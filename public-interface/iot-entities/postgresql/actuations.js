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
var interpreter = require('../../lib/interpreter/postgresInterpreter').actuations(),
    actuations = require('./models').actuations,
    deviceComponents = require('./models').deviceComponents,
    devices = require('./models').devices;

var getActuationRelations = function(){
    return [
        {
            model: deviceComponents,
            include: {
                model: devices
            }
        }
    ];
};

exports.findById = function (id, resultCallback) {
    var filter = {
        include: getActuationRelations(),
        where: {
            id: id
        }
    };

    return actuations.find(filter)
        .then(function (actuation) {
            actuation = interpreter.toApp(actuation);
            resultCallback(null, actuation);
        });
};

exports.findByDeviceId = function (deviceId, limit, dateFilter, resultCallback) {
    var filter = {
        include: getActuationRelations(),
        order:[['created','DESC']]
    };
    filter.include[0].include["where"] = {id: deviceId};

    if (dateFilter) {
        filter["where"] = {
            created:{$gt:dateFilter.from}};
        filter["limit"] = limit;

    }

    return actuations.findAll(filter)
        .then(function (actuations) {
            actuations = actuations.map(function(actuation) {
                return interpreter.toApp(actuation);
            });
            resultCallback(null, actuations);
        });
};

exports.new = function (data, resultCallback) {
    var actuationModel = interpreter.toDb(data);
    return actuations.create(actuationModel)
        .then(function (actuation) {
            return actuations.find({
                where: {id: actuation.id},
                include: getActuationRelations()})
                .then(function (actuation) {
                    actuation = interpreter.toApp(actuation);
                    return resultCallback(null, actuation);
                });
        })
        .catch(function (err) {
            resultCallback(err);
        });
};

exports.deleteByDeviceId = function (deviceId, resultCallback) {
    var filter = {
        include: getActuationRelations(),

    };
    filter.include[0].include["where"] = {id: deviceId};

    actuations.destroy(filter)
        .then(function(){
            resultCallback();
        });
};

