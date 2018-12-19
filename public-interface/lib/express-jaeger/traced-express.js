var httpContext = require('express-http-context'),
    express = require('express'),
    tracer = require('./jaeger-tracer');

var httpContextRegistered = false;

var startRequest = function(req, res, next) {
    const span = tracer.startSpan('start-request');
    span.log({
        event: 'request begin'
    });
    const middlewareSpan = tracer.startSpan('middleware', { childOf: span });
    const routeSpan = tracer.startSpan(req.path, { childOf: span });
    routeSpan.setTag(req.method);
    httpContext.set('middlewareSpan', middlewareSpan);
    httpContext.set('routeSpan', routeSpan);
    res.on('finish', function() {
        span.log({
            event: 'request finish'
        });
        middlewareSpan.finish();
        routeSpan.finish();
        span.finish();
    });
    next();
}

// Override Express Server's register methods

var useOriginal = express.application.use,
    getOriginal = express.application.get,
    putOriginal = express.application.put,
    postOriginal = express.application.post,
    deleteOriginal = express.application.delete,
    allOriginal = express.application.all;

express.application['registerHttpContextAndStartTracing'] = function() {
    useOriginal.apply(this, ['/', httpContext.middleware]);
    useOriginal.apply(this, ['/', startRequest]);
    httpContextRegistered = true;
};

var patchMiddlewares = function(middlewares, startIndex, method, parentSpanName) {
    for (i = startIndex; i < middlewares.length; i++) {
        if (Array.isArray(middlewares[i]))
            patchMiddlewares(middlewares[i], 0);
        else if (typeof middlewares[i] === "function") {
            var funcToCall = middlewares[i];
            var serviceName = middlewares[i].name;
            var spanTransform = function(service, name) {
                return function(req, res, next) {
                    const parentSpan = httpContext.get(parentSpanName);
                    const span = tracer.startSpan(name, {
                        childOf: parentSpan
                    });
                    span.setTag(method.toUpperCase());
                    service(req, res, next);
                    span.finish();
                };
            };
            middlewares[i] = spanTransform(funcToCall, serviceName);
        }
    }
}

var forkedRegister = function(original, method, parentSpanName) {
    return function() {
        if (httpContextRegistered) {
            var path = typeof arguments[0] === "string" ? arguments[0] : '/';
            var start = typeof arguments[0] === "string" ? 1 : 0;
            patchMiddlewares(arguments, start, method, parentSpanName);
            original.apply(this, arguments);
        } else {
            original.apply(this, arguments);
        }
    }
}

express.application['use'] = forkedRegister(useOriginal, 'use', 'middlewareSpan');

express.application['get'] = forkedRegister(getOriginal, 'get', 'routeSpan');

express.application['put'] = forkedRegister(putOriginal, 'put', 'routeSpan');

express.application['post'] = forkedRegister(postOriginal, 'post', 'routeSpan');

express.application['delete'] = forkedRegister(deleteOriginal, 'delete', 'routeSpan');

express.application['all'] = forkedRegister(allOriginal, 'all', 'routeSpan');

module.exports = express;
