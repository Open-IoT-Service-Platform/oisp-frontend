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

var componentTypes = require('./models').componentTypes,
    interpreterHelper = require('../../lib/interpreter/helper'),
    Q = require('q'),
    errBuilder = require("../../lib/errorHandler/index").errBuilder,
    interpreter = require('../../lib/interpreter/postgresInterpreter').componentTypes();

exports.new = function (data, t) {
    var componentModel = interpreter.toDb(data);
    return componentTypes.create(componentModel, {transaction: t})
        .then(function (component) {
            return Q.resolve(interpreterHelper.mapAppResults(component, interpreter));
        })
        .catch(function (err) {
            if (err.name === errBuilder.SqlErrors.AlreadyExists) {
                throw errBuilder.build(errBuilder.Errors.Component.AlreadyExists);
            }
            else {
                throw err;
            }
        });
};

exports.all = function (accountId, detailed, resultCallback) {
    var query = {
        where: {
            $or: [
                {
                    accountId: accountId
                },
                {
                    accountId: null
                }
            ]
        },
        order: ['dimension', 'version']
    };
    if (!detailed) {
        query.attributes = ['componentTypeId', 'dimension', 'version', 'type'];
    }

    return componentTypes.findAll(query)
        .then(function (components) {
            return Q.resolve(interpreterHelper.mapAppResults(components, interpreter, resultCallback));
        });
};

exports.findByIdAndAccount = function (compId, accountId, t) {
    var query = {
        where: {
            $or: [
                {
                    accountId: accountId,
                    componentTypeId: compId
                },
                {
                    accountId: null,
                    componentTypeId: compId,
                    default: true
                }
            ]
        },
        transaction: t
    };

    return componentTypes.findAll(query)
        .then(function (components) {
            if (components && components.length > 0) {
                if (!Array.isArray(compId)) {
                    return Q.resolve(interpreterHelper.mapAppResults(components[0], interpreter));
                } else {
                    return Q.resolve(interpreterHelper.mapAppResults(components, interpreter));
                }
            }
            else {
                throw errBuilder.build(errBuilder.Errors.Component.NotFound);
            }
        });
};

exports.findByDimensionAndAccount = function (dimension, accountId, t) {
    var query = {
	        where: {
	            $or: [
	                {
	                    accountId: accountId,
	                    dimension: dimension
	                },
	                {
	                    accountId: null,
	                    dimension: dimension,
	                    default: true
	                }
	            ]
	        },
	        transaction: t
	    };
    return componentTypes.findAll(query)
        .then(function (component) {
            return Q.resolve(interpreterHelper.mapAppResults(component, interpreter));
        });
};
