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

var mailer = require('../../../lib/mailer'),
    async = require('async');

module.exports = function() {
    return {
        execute: function(options, done) {
            async.each(options.action.target, function(target, asyncCallback) {
                var data = {
                    subject: 'OISP alert - Intel(r) Corporation',
                    email: target,
                    data: options.data
                };
                mailer.send('incoming-alert', data);
                asyncCallback();
            }, function(err){
                done(err);
            });
        }
    };
};
