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

var contextProvider = require('./../../lib/context-provider').instance(),
    shimmer = require('shimmer'),
    express = require('express'),
    opentracing = require('opentracing'),
    tracer = require('./jaeger-tracer'),
    methods = require('methods').concat('use', 'route', 'param', 'all');

const spanContext = {
    root: 'rootSpan',
    parent: 'parentSpan',
    active: 'activeSpan'
};

var middlewareMethods = ['use', 'param'];
var contextRegistered = false;

var startRequest = function(req, res, next) {
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

    contextProvider.set(spanContext.root, rootSpan);
    contextProvider.set(spanContext.parent, parentSpan);

    res.on('finish', function() {
        const lastActive = contextProvider.get(spanContext.active);
        if (lastActive) {
            lastActive.finish();
            contextProvider.set(spanContext.active);
        }
        const lastParent = contextProvider.get(spanContext.parent);
        lastParent.span.finish();
        contextProvider.set(spanContext.parent, null);
        rootSpan.log({ event: 'request finish' });
        rootSpan.setTag(opentracing.Tags.HTTP_STATUS_CODE, res.statusCode);
        if (res.statusCode >= 400)
            rootSpan.setTag(opentracing.Tags.ERROR, true);
        rootSpan.finish();
    });
    next();
}

express.application['startTracing'] = function() {
    if (!contextRegistered) {
        this.use('/', startRequest);
        contextRegistered = true;
    }
};

var patchMiddlewares = function(middlewares, startIndex, method) {
    for (i = startIndex; i < middlewares.length; i++) {
        if (Array.isArray(middlewares[i]))
            patchMiddlewares(middlewares[i], 0);
        else if (typeof middlewares[i] === "function") {
            var funcToCall = middlewares[i];
            var serviceName = middlewares[i].name;
            var spanTransform = function(service, name) {
                return function(req, res, next) {
                    // check and end if there is an active span
                    const active = contextProvider.get(spanContext.active);
                    if (active)
                        active.finish();
                    var parentSpan = contextProvider.get(spanContext.parent);
                    if (!parentSpan) {
                        // untracked middlewares after request gets handled
                        service(req,res, next);
                        return;
                    }
                    // check if middlewares our routes have ended
                    var index = middlewareMethods.indexOf(method);
                    if (index <= -1 && parentSpan.type === 'middleware') {
                        parentSpan.span.finish();
                        parentSpan.type = 'route';
                        const root = contextProvider.get(spanContext.root);
                        parentSpan.span = tracer.startSpan('route', {
                            childOf: root
                        });
                    } else if (index >= 0 && parentSpan.type === 'route') {
                        parentSpan.span.finish();
                        parentSpan.type = 'middleware';
                        const root = contextProvider.get(spanContext.root);
                        parentSpan.span = tracer.startSpan('middleware', {
                            childOf: root
                        });
                    }
                    const span = tracer.startSpan(name, {
                        childOf: parentSpan.span
                    });
                    span.setTag('METHOD', method.toUpperCase());
                    contextProvider.set(spanContext.active, span);
                    service(req, res, next);
                };
            };
            middlewares[i] = spanTransform(funcToCall, serviceName);
        }
    }
}

var wrapRegister = function(method) {
    return function(original) {
        return function() {
            if (contextRegistered) {
                var path = typeof arguments[0] === "string" ? arguments[0] : '/';
                var start = typeof arguments[0] === "string" ? 1 : 0;
                patchMiddlewares(arguments, start, method);
                original.apply(this, arguments);
            } else {
                original.apply(this, arguments);
            }
        };
    };
}

// Override Express Server's register functions
methods.forEach((method) => {
    shimmer.wrap(express.application, method, wrapRegister(method));
});

module.exports = {
    express: express,
    spanContext: spanContext,
};
