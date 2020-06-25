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


"use strict";
var logger = require('../logger/index').init(),
    config = require('../../config'),
    postgresProvider = require('../../iot-entities/postgresql'),
    redisProvider = require('../../iot-entities/redis').InitProvider(),
    RateLimits = redisProvider.RateLimits,
    PurchasedLimitsRedis = redisProvider.PurchasedLimits,
    PurchasedLimitsPostgres = postgresProvider.purchasedLimits,
    routesConfig = [],
    errors = require('../../engine/res/errors');


// Paths which do not require authorization (by using token) are not rate limited
// Short paths are limited per user
// Full paths (with account) are limited per account
// Limit is reset after an hour from first request
// Limit of requests per route and method is specified in 4th column of routes.config.js
// If limit is not defined there, rate limit value is taken from global config
// If user purchased more requests for him or his accounts, this limit is taken instead of values in configs.
var limit = function (req, res, next) {

    var checkRouteConfigRow = function (routeConfigRow) {

        var getAccountIdFromPath = function (route) {
            if (route.indexOf('/accounts/.*') >= 0) {
                var routeParts = req.path.split('/');
                for (var index = 0; index < routeParts.length; index++) {
                    if (routeParts[index] === 'accounts') {
                        return routeParts[index + 1];
                    }
                }
            }
            return null;
        };

        var getTheOnlyAccountIdFromToken = function () {
            if (req.accounts && Object.keys(req.accounts).length === 1) {
                return Object.keys(req.accounts)[0];
            }
            return null;
        };

        var isRequestMatchingPathAndMethodFromRouteConfigRow = function (routeConfigRow) {
            return routeConfigRow.verb === req.method && routeConfigRow.regex.test(req.path);
        };

        if (isRequestMatchingPathAndMethodFromRouteConfigRow(routeConfigRow)) {
            var method = routeConfigRow.verb;
            var route = routeConfigRow.path;
            var accountId = getAccountIdFromPath(route) || getTheOnlyAccountIdFromToken();
            var requester = accountId || req.identity;
            var processRequest = function (err, rateLimit) {

                var reportDBError = function () {
                    logger.error('RateLimit DB error ' + JSON.stringify(err));
                    res.status(errors.Errors.Generic.InternalServerError.code).send();
                };

                var isAcquiredRateLimitCorrect = function (rateLimit) {
                    return rateLimit && rateLimit.hits && rateLimit.ttl;
                };

                var checkLimitAndProceed = function (err, purchasedLimit) {

                    var setXRateLimitHeaders = function (limit, remaining, timeToReset) {
                        res.set('X-Rate-Limit-Limit', limit);
                        res.set('X-Rate-Limit-Remaining', remaining);
                        res.set('X-Rate-Limit-Reset', timeToReset);
                    };

                    var reportLimitHasBeenExceeded = function (timeToReset) {
                        logger.info('Limit for ' + requester + ' for route ' + route + ' exceeded');
                        res.status(errors.Errors.Generic.RateLimit.code).send({
                            error: 'RateLimit',
                            message: 'Too many requests. Limit will reset in ' + timeToReset + ' seconds'
                        });
                    };
                    var limit = routeConfigRow.limit || config.rateLimit;

                    if(purchasedLimit && purchasedLimit.limit){
                        limit = purchasedLimit.limit;
                    }

                    var remaining = limit - rateLimit.hits;
                    var timeToReset = rateLimit.ttl;

                    setXRateLimitHeaders(limit, remaining, timeToReset);

                    if (remaining >= 0) {
                        next();
                    } else {
                        reportLimitHasBeenExceeded(timeToReset);
                    }
                };

                var reportCorruptedRateLimitObjectAcquired = function () {
                    logger.error('No rateLimit row acquired for ' + requester + ' ' + method + ' ' + route);
                    res.status(errors.Errors.Generic.InternalServerError.code).send();
                };

                if (err) {
                    reportDBError();
                } else if (isAcquiredRateLimitCorrect(rateLimit)) {
                    PurchasedLimitsRedis.getPurchasedLimitForRoute(accountId, route, method, function (err, purchasedLimit) {
                        if (!err && purchasedLimit && purchasedLimit.limit) {
                            checkLimitAndProceed(err, purchasedLimit);
                        } else {
                            PurchasedLimitsPostgres.getLimitForRoute(accountId, route, method, function (err, purchasedLimit) {
                                checkLimitAndProceed(err, purchasedLimit);
                                if (!err) {
                                    purchasedLimit = purchasedLimit || {limit: routeConfigRow.limit || config.rateLimit};
                                    PurchasedLimitsRedis.setPurchasedLimitForRoute(accountId, route, method, purchasedLimit.limit);
                                }

                            });
                        }
                    });

                } else {
                    reportCorruptedRateLimitObjectAcquired();
                }
            };

            RateLimits.incrementCounter(accountId, route, method, processRequest);
            return true;
        } else {
            return false;
        }
    };

    // Skip checking if rate limits are disabled
    if (config.rateLimit === 'limitless') {
        next();
    } else if (req.identity) {
        // If flow passed authorization, correct path should exist on the list
        routesConfig.some(checkRouteConfigRow);
    } else {
        // User is not recognizable. We cannot block him yet
        next();
    }
};

module.exports.init = function (config) {

    config.routes.forEach(function (i) {
        routesConfig.push({
            path: i[0],
            regex: new RegExp("^" + i[0] + "/*$", "i"),
            verb: i[1],
            scope: i[2],
            limit: i[3]
        });
    });
};

module.exports.limit = limit;
