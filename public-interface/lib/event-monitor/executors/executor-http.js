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

var async = require('async'),
    request = require('request'),
    logger = require('../../../lib/logger').init();

module.exports = function() {
    return {
        execute: function(options, done) {
            async.each(options.action.target, function(target, asyncCallback) {
                var optionsBody = {
                    url: target,
                    method: 'PUT',
                    json: options.data,
                    headers: options.action.http_headers
                };

                request(optionsBody, function(err, res){
                    if(!err && res && (res.statusCode === 200 || res.statusCode === 201)){
                        asyncCallback();
                    } else {
                        if(res){
                            logger.error('Could not send alert to http endpoint. Response: ' + JSON.stringify(
                                {
                                    statusCode: res.statusCode,
                                    body: res.body
                                }));
                            logger.debug("Error:" + JSON.stringify(err));
                        } else {
                            logger.error('Could not send alert to http endpoint: ' + target + '. No response received.');
                            logger.debug("Error:" + JSON.stringify(err));
                        }
                        asyncCallback();
                    }
                });
            }, function(err){
                done(err);
            });
        }
    };
};
