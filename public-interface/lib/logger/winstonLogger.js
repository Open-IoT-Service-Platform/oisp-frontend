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

var winston = require('winston'),
    expressWinston = require('express-winston'),
    loggerConf = require('../../config').logger,
    logLevel = require('./logLevel');

winston.addColors(logLevel.logLevels.colors);

module.exports = winston.createLogger({
    format: loggerConf.format,
    levels: logLevel.logLevels.levels,
    transports: loggerConf.frontendTransports,
    exitOnError: loggerConf.exitOnError,
    maxLines: loggerConf.maxLines
});

module.exports.httpLogger = function () {
    expressWinston.requestWhitelist.push('body');
    expressWinston.responseWhitelist.push('body');
    return expressWinston.logger({
    	level: loggerConf.level,
        format: loggerConf.format,
        transports: loggerConf.httpTransports,
        meta: false,
        msg: " REQUESTED: {{req.url}}, {{req.method}}, requestId={{req.headers['x-iotkit-requestid']}} {{req.headers['x-intel-loglevel']}}" +
        " RESPONDED: {{req.url}}, {{req.method}}, HTTP Code: {{res.statusCode}}, requestId={{req.headers['x-iotkit-requestid']}} {{req.headers['x-intel-loglevel']}}",
        expressFormat: false,
        ignoreRoute: function () { return false; }
    });
};
