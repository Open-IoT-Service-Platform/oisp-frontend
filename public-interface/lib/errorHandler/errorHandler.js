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

var logger = require('./../logger').init(),
    errorList = require('../../engine/res/errors'),
    errDefinition = null;

Error.prototype.asResponse = function() {
    return {
        code: this.code,
        message: this.message,
        errors: this.errors
    };
};

function parseError(code) {
    if (!errDefinition || !errDefinition[code]) {
        return {status: 500, message: "Unknown Platform Error"};
    }
    return errDefinition[code];
}

exports.middleware = function(_errDefinition) {

    errDefinition = _errDefinition;

    /* jshint unused:false */
    /* express treats middleware with 3 arguments differently */
    return function(err, req, res, _next) {
        console.log(err);
        logger.error('error-handler. error: ' + JSON.stringify(err));
        if(err.status) {
            if (err.business) {
                res.status(err.status).send( err.asResponse());
            } else if (err.name && err.name === 'SyntaxError') {
                // invalid request
                res.status(err.status).send( errorList.Errors.Generic.InvalidRequest);
            } else {
                var error = errorList.Errors.Generic.InternalServerError;
                res.status(error.status).send( error);
            }
        } else {
            res.status(errorList.Errors.Generic.InternalServerError.status).send( errorList.Errors.Generic.InternalServerError);
        }

    };
    /* jshint unused:true */
};

function buildError(errorObject, errors){
    var error = new Error(errorObject.message);
    error.business = true;
    error.status = errorObject.status;
    error.code = errorObject.code;
    if (errors) {
        error.errors = errors;
    }
    return error;
}


exports.errBuilder = (function() {
    return {
        build: function(code, errors) {
            if(isNaN(code)){
                return buildError(code, errors);
            }
            var customErr = parseError(code);
            customErr.code = code;
            return buildError(customErr, errors);
        },
        Errors: errorList.Errors,
        SqlErrors: errorList.SqlErrors
    };
})();
