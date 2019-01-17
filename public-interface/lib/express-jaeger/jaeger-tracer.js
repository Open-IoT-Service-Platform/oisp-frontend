/**
 * Copyright (c) 2019 Intel Corporation
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

var initJaegerTracer = require("jaeger-client").initTracer;

var initTracer = function(serviceName) {
    const config = {
        serviceName: serviceName,
        sampler: {
            type: "const",
            param: 1,
        },
        reporter: {
            logSpans: true,
            agentHost: "jaeger",
            agentPort: 6832
        },
    };
    const options = {
        logger: {
            info(msg) {
                console.log("INFO ", msg);
            },
            error(msg) {
                console.log("ERROR ", msg);
            },
        },
    };
    return initJaegerTracer(config, options);
}

// Singleton
var tracer;

module.exports = function() {
    if (tracer)
        return tracer;
    else {
        tracer = initTracer('frontend');
        return tracer;
    }
}();
