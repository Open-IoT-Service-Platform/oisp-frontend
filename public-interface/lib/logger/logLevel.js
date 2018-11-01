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

exports.logLevels = {
		levels: {
			all: 0,
	        debug:1,
	        info: 2,
	        warn: 3,
	        error: 4,
	        critical: 5
		},
		colors: {
			all: 'magenta',
		    debug: 'blue',
		    info : 'green',
		    warn : 'yellow',
		    error: 'red',
		    critical: 'red'
		}
}


exports.compareLevel = function(level1, level2) {
  var rv = false;
  if (this.logLevels.levels[level1] && this.logLevels.levels[level2]) {
    rv = this.logLevels.levels[level1] >= this.logLevels.levels[level2];
  }
  return rv;
};