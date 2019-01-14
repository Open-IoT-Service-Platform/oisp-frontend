var opentracing = require('opentracing'),
    initJaegerTracer = require("jaeger-client").initTracer;

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

module.exports = initTracer("frontend");
