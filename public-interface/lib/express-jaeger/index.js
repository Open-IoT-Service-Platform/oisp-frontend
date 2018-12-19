var express = require('./traced-express'),
    tracer = require('./jaeger-tracer');

module.exports = {
    express: express,
    tracer: tracer,
};
