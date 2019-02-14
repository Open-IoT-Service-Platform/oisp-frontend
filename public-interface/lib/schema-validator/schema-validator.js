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
var validator = require('../json-gate').createSchema,
    errBuilder = require('./../../lib/errorHandler').errBuilder;

var validate = function(obj, schema){
    var schemaJs = validator(schema);
    return schemaJs.validate(obj).errors.map(function(e){
        e.customMessage = e.property + ' ' + e.message;
        return e;
    });
};

var validateSchema = function(schema){
    return function(req, res, next){
        var errors = validate(req.body, schema);
        if(errors.length > 0){
            next(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest, errors.map(function (e) {
                return e.customMessage;
            })));
        } else {
            next();
        }
    };
};

var validateDynamicSchema = function(schemaSelector){
    return function(req, res, next){
        var schema = schemaSelector(req);
        var errors = validate(req.body, schema);

        if(errors.length > 0){
            next(errBuilder.build(errBuilder.Errors.Generic.InvalidRequest, errors.map(function (e) {
                return e.customMessage;
            })));
        } else {
            next();
        }
    };
};

module.exports = {
    validate: validate,
    validateSchema: validateSchema,
    validateDynamicSchema: validateDynamicSchema
};