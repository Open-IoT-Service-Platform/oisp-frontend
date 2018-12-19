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
        },
    };
    const options = {
        logger: {
            info(msg) {
                console.log("INFO ", msg);
            },
            error(msg) {
                console.log("ERROR", msg);
            },
        },
    };
    return initJaegerTracer(config, options);
}

module.exports = initTracer("frontend");
