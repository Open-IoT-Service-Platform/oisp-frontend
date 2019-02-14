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

var contextProvider = require('./../../lib/context-provider'),
    shimmer = require('shimmer'),
    express = require('express'),
    opentracing = require('opentracing'),
    tracer = require('./jaeger-tracer'),
    jaegerConfig = require('./../../config').jaeger,
    methods = require('methods').concat('use', 'route', 'param', 'all');

const spanContext = {
    root: 'rootSpan',
    parent: 'parentSpan',
    active: 'activeSpan'
};

var middlewareMethods = ['use', 'param'];
var contextRegistered = false;

function startRequest(req, res, next) {
    const context = contextProvider.instance();
    const rootSpan = tracer.startSpan('start-request');
    rootSpan.log({
        event: 'request begin',
        peerRemoteAddress: req.connection.remoteAddress
    });
    const middlewareSpan = tracer.startSpan('middleware', { childOf: rootSpan });
    const parentSpan = { span: middlewareSpan, type: 'middleware' };

    rootSpan.setTag(opentracing.Tags.HTTP_URL, req.url);
    rootSpan.setTag(opentracing.Tags.HTTP_METHOD, req.method);
    const paths = req.url.split("/");
    const parentPaths = ['/'];
    paths.forEach((path) => {
        const index = parentPaths.length - 1;
        const parent = parentPaths[index];
        const subPath = parent.concat(path);
        rootSpan.setTag('PARENT_PATH_' + index, subPath);
        parentPaths.push(subPath !== '/' ? subPath.concat('/') : subPath);
    });

    context.set(spanContext.root, rootSpan);
    context.set(spanContext.parent, parentSpan);

    // res.end is always called after message is done
    const originalEnd = res.end;
    res.end = function(...args) {
        res.end = originalEnd;
        const returned = res.end.call(this, ...args);

        const lastActive = context.get(spanContext.active);
        if (lastActive) {
            lastActive.finish();
            context.set(spanContext.active, null);
        }
        const lastParent = context.get(spanContext.parent);
        if (lastParent) {
            lastParent.span.finish();
            context.set(spanContext.parent, null);
        }
        context.set(spanContext.parent, null);
        rootSpan.log({ event: 'request finish' });
        rootSpan.setTag(opentracing.Tags.HTTP_STATUS_CODE, res.statusCode);
        if (res.statusCode >= 400) {
            rootSpan.setTag(opentracing.Tags.ERROR, true);
        }
        rootSpan.finish();
        return returned;
    };

    return next();
}

express.application['startTracing'] = function() {
    if (!contextRegistered && jaegerConfig.tracing) {
        this.use('/', startRequest);
        contextRegistered = true;
    }
};

function tracedMiddleware(originalService, name, method) {
    return function(req, res, next) {
        const context = contextProvider.instance();
        // check and end if there is an active span
        const active = context.get(spanContext.active);
        if (active) {
            active.finish();
        }
        var parentSpan = context.get(spanContext.parent);
        if (!parentSpan) {
            // untracked middlewares after request gets handled
            return originalService(req,res, next);
        }
        // check if middlewares our routes have ended
        var index = middlewareMethods.indexOf(method);
        if (index <= -1 && parentSpan.type === 'middleware') {
            parentSpan.span.finish();
            parentSpan.type = 'route';
            const root = context.get(spanContext.root);
            parentSpan.span = tracer.startSpan('route', {
                childOf: root
            });
        } else if (index >= 0 && parentSpan.type === 'route') {
            parentSpan.span.finish();
            parentSpan.type = 'middleware';
            const root = context.get(spanContext.root);
            parentSpan.span = tracer.startSpan('middleware', {
                childOf: root
            });
        }
        const span = tracer.startSpan(name, {
            childOf: parentSpan.span
        });
        span.setTag('METHOD', method.toUpperCase());
        context.set(spanContext.active, span);
        return originalService(req, res, next);
    };
}

const ERROR_HANDLER_ARGUMENTS_LENGTH = 4;
function tracedErrorHandler(originalErrorHandler, name, method) {
    return function (err, req, res, _next) {
        // check and end if there is an active span
        const context = contextProvider.instance();
        const active = context.get(spanContext.active);
        if (active)
        {active.finish();}
        var parentSpan = context.get(spanContext.parent);
        if (!parentSpan) {
            // untracked middlewares after request gets handled
            return originalErrorHandler(err, req, res, _next);
        }
        const span = tracer.startSpan(name, {
            childOf: parentSpan.span
        });
        span.setTag('METHOD', method.toUpperCase());
        if (err)
        {span.log({
            event: 'error',
            error: err,
            message: err.message,
            stack: err.stack
        });}
        context.set(spanContext.active, span);
        return originalErrorHandler(err, req, res, _next);
    };
}

function patchMiddlewares(middlewares, startIndex, method) {
    for (var i = startIndex; i < middlewares.length; i++) {
        if (Array.isArray(middlewares[i])) {
            patchMiddlewares(middlewares[i], 0);
        }
        else if (typeof middlewares[i] === "function") {
            var original = middlewares[i];
            var name = middlewares[i].name;
            var wrap = original.length < ERROR_HANDLER_ARGUMENTS_LENGTH ?
                tracedMiddleware : tracedErrorHandler;
            middlewares[i] = wrap(original, name, method);
        }
    }
}

function wrapRegister(method) {
    return function(original) {
        return function() {
            if (contextRegistered) {
                var start = typeof arguments[0] === "string" ? 1 : 0;
                patchMiddlewares(arguments, start, method);
                original.apply(this, arguments);
            } else {
                original.apply(this, arguments);
            }
        };
    };
}

if (jaegerConfig.tracing) {
    // Override Express Server's register functions
    methods.forEach((method) => {
        shimmer.wrap(express.application, method, wrapRegister(method));
    });
}

module.exports = {
    express: express,
    spanContext: spanContext,
};
