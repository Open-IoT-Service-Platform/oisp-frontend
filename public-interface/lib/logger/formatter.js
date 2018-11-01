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

var util = require('util'),
    logLevelObject = require('./logLevel'),
    contextProvider = require('./../context-provider').instance(),
    securityUtils = require('../../lib/security/utils'),
    NOT_INCLUDED = 'NOT_INCLUDED';

module.exports = function(options) {
    this.env = options.env;
    this.machineName = options.machineName;
    this.maxLines = options.maxLines;

    this.format = function(message, logLevel, opt) {
        var logLine = {};
        var tags = [];


        if (message && logLevel && logLevelObject.logLevels.levels[logLevel]) {

            logLine.message = limitOutputLines(message, this.maxLines);
            logLine.requestid = contextProvider.get('requestid') || 'n/a';
            logLine.env = this.env;
            logLine.machineName = this.machineName;

            var requestId;
            if (opt) {
                if (opt.statusCode) {
                    logLine.httpCode = opt.statusCode;
                }
                if (opt.method) {
                    logLine.httpMethod = opt.method;
                }
                //opt.object is available only in debug level
                if (opt.object) {
                    if (opt.object.headers) {
                        var headers = opt.object.headers;
                        requestId = headers['x-iotkit-requestid'] ? headers['x-iotkit-requestid']: NOT_INCLUDED;
                        var ip = headers['x-forwarded-for'] ? headers['x-forwarded-for']: NOT_INCLUDED;
                        var url = opt.object.url;

                        logLine.requestid = requestId;
                        logLine.ip = ip;
                        logLine.url = url;
                        logLine.authorization = headers['authorization'] ? headers['authorization'].substring(0, 20) + '...' : NOT_INCLUDED;
                        logLine.body = limitOutputLines(util.inspect(opt.object.body), this.maxLines);
                    }
                    if (opt.printObject) {
                        logLine.object = limitOutputLines(util.inspect(opt.object, {depth:2}), this.maxLines);
                    }
                } else {
                    if (opt.requestId) {
                        requestId = opt.requestId;
                        logLine.requestid = requestId;
                    }
                    addAuthorizationData(logLine, opt.headers);
                }
                if (opt.requestId) {
                    requestId = opt.requestId;
                    logLine.requestid = requestId;
                }

                if (util.isError(opt.object)) {
                    logLine.error = {
                        message: opt.object.message,
                        stackTrace: limitOutputLines(opt.object.stack)
                    };
                }
            }
            if (logLine.requestid && logLine.requestid.indexOf(':') > -1) {
                tags.push(logLine.requestid.substring(0, logLine.requestid.indexOf(':')));
            }

            logLine.tags = tags;
        }

        return logLine;
    };

    function addAuthorizationData(logLine, headers) {
        if (headers) {
            var authorization =  headers['authorization'];
            if (authorization) {
                logLine.authorization = authorization.substring(0, 20) + '...';
                logLine.subjectId = securityUtils.getSubjectFromHeader(authorization);
            }
        }
    }
  
    function limitOutputLines(message, maxLines) {
        maxLines = maxLines || 1000000; // default
        var ret = '';

        if (typeof message === 'string') {
            var lines = message.split(' ');
            var absoluteMax = lines.length < maxLines ? lines.length: maxLines;
            for (var i = 0; i < absoluteMax; i++) {
                ret = ret + lines[i];
                if((i < absoluteMax - 1)) {
                    ret = ret + ' ';
                }
            }
            if (lines.length > maxLines) {
                ret = ret + '...';
            }
            ret = ret.split('\n').join(' ');
        } else {
            ret = message;
        }

        return ret;
    }
};