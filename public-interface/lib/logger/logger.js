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
var loggerConf = require('../../config').logger,
    logLevel = require('./logLevel'),
    winstonLogger = require('./winstonLogger');

function getLevelToCompare(options) {
    var levelToCompare = loggerConf.level;
    if (options && options.forceLogLevel) {
        levelToCompare = options.forceLogLevel;
    }
    return levelToCompare;
}

var logger = function(formatter) {
    this.formatter = formatter;
};

logger.prototype.debug = function(message, options) {
    if (logLevel.compareLevel('debug', getLevelToCompare(options))) {
        winstonLogger.debug(this.formatter.format(message, 'debug', options));
    }
};

logger.prototype.info = function(message, options) {
    if (logLevel.compareLevel('info', getLevelToCompare(options))) {
        winstonLogger.info(this.formatter.format(message, 'info', options));
    }
};


logger.prototype.log = function(message, options) {
    if (logLevel.compareLevel('info', getLevelToCompare(options))) {
        winstonLogger.info(this.formatter.format(message, 'info', options));
    }
};

logger.prototype.warn = function(message, options) {
    if (logLevel.compareLevel('warn', getLevelToCompare(options))) {
        winstonLogger.warn(this.formatter.format(message, 'warn', options));
    }
};

logger.prototype.error = function(message, options) {
    if (logLevel.compareLevel('error', getLevelToCompare(options))) {
        winstonLogger.error(this.formatter.format(message, 'error', options));
    }
};

logger.prototype.critical = function(message, options) {
    if (logLevel.compareLevel('critical', getLevelToCompare(options))) {
        winstonLogger.critical(this.formatter.format(message, 'critical', options));
    }
};

module.exports = logger;
