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

var contextProvider = require('../../lib/context-provider').instance(),
    shimmer = require('shimmer'),
    express = require('express'),
    tracer = require('./jaeger-tracer');

var contextRegistered = false;

var startRequest = function(req, res, next) {
    const span = tracer.startSpan('start-request');
    span.log({
        event: 'request begin'
    });
    const middlewareSpan = tracer.startSpan('middleware', { childOf: span });
    const routeSpan = tracer.startSpan(req.path, { childOf: span });
    routeSpan.setTag('METHOD', req.method);
    contextProvider.set('middlewareSpan', middlewareSpan);
    contextProvider.set('routeSpan', routeSpan);
    res.on('finish', function() {
        span.log({
            event: 'request finish'
        });
        const routeSpan = contextProvider.get('routeSpan');
        middlewareSpan.finish();
        routeSpan.finish();
        span.finish();
    });
    next();
}

express.application['startTracing'] = function() {
    if (!contextRegistered) {
        this.use('/', startRequest);
        contextRegistered = true;
    }
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
                    const parentSpan = contextProvider.get(parentSpanName);
                    const span = tracer.startSpan(name, {
                        childOf: parentSpan
                    });
                    span.setTag('METHOD', method.toUpperCase());
                    service(req, res, next);
                    span.finish();
                };
            };
            middlewares[i] = spanTransform(funcToCall, serviceName);
        }
    }
}

var forkedRegister = function(method, parentSpanName) {
    return function(original) {
        return function() {
            if (contextRegistered) {
                var path = typeof arguments[0] === "string" ? arguments[0] : '/';
                var start = typeof arguments[0] === "string" ? 1 : 0;
                patchMiddlewares(arguments, start, method, parentSpanName);
                original.apply(this, arguments);
            } else {
                original.apply(this, arguments);
            }
        };
    };
}

// Override Express Server's register functions
shimmer.wrap(express.application, 'use', forkedRegister('use', 'middlewareSpan'));
shimmer.wrap(express.application, 'get', forkedRegister('get', 'routeSpan'));
shimmer.wrap(express.application, 'put', forkedRegister('put', 'routeSpan'));
shimmer.wrap(express.application, 'post', forkedRegister('post', 'routeSpan'));
shimmer.wrap(express.application, 'delete', forkedRegister('delete', 'routeSpan'));
shimmer.wrap(express.application, 'all', forkedRegister('all', 'routeSpan'));

module.exports = express;
