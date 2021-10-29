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
var expect = require('expect.js'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    uuid = require('uuid'),
    shortPathLimit = 7,
    fullPathLimit = 7,
    mockedRoutesConfig = {
        routes: [
        ["/api/health",                                 "GET",          "api:public"                            ],

        ["/api/devices",                                "GET",          "device:read",    shortPathLimit        ],
        ["/api/accounts/.*/devices/.*",                 "PUT",          "device:admin",   fullPathLimit         ]
    ]},
    rateLimiter = rewire('../../../../lib/security/limit');

rateLimiter.init(mockedRoutesConfig);

describe('Rate Limiting Module', function() {
    var req, res, rateLimitsDbMock, purchasedLimitsDbMock, configMock, next;
    var rateLimitTuple, purchasedLimitTuple, notPurchasedLimitTuple, dbError, purchasedLimitsPostgresMock;
    var hourInSeconds = 3600, tooManyRequests = 429, internalServerError = 500;
    var success = null;
    var responseCode;

    var expectResponseCode = function (code, body) {
        expect(res.send.calledOnce).to.equal(true);
        expect(responseCode).to.eql(code);
        if (body) {
            expect(res.send.calledWith(body)).to.equal(true);
        }
    };

    beforeEach(function(){
        responseCode = null;

        req = {
            identity: "53fde8bf2294fb8391a1b9fd",
            path: "/api/devices",
            method: "GET"
        };
        res = {
            send: sinon.spy(),
            set: sinon.spy(),
            status: function(code) {
                responseCode = code;
                return this;
            }
        };
        rateLimitsDbMock = {
            incrementCounter: sinon.stub()
        };
        purchasedLimitsDbMock = {
            getPurchasedLimitForRoute: sinon.stub(),
            setPurchasedLimitForRoute: sinon.stub()
        };
        configMock = {
            rateLimit: shortPathLimit
        };
        next = sinon.spy();
        rateLimitTuple = {
            "created" : new Date(),
            "hits" : 1,
            "ttl": hourInSeconds,
            "method" : req.method,
            "route" : req.path,
            "limit" : shortPathLimit,
            "requesterId" : req.identity
        };
        purchasedLimitTuple = {
            "requesterId" : req.identity,
            "method" : req.method,
            "route" : req.path,
            "limit" : shortPathLimit+2,
            "ttl": hourInSeconds
        };
        notPurchasedLimitTuple = {};

        purchasedLimitsPostgresMock = {
            getLimitForRoute: sinon.stub().callsArgWith(3, null, rateLimitTuple)
        };
        dbError = {
            message: 'DB Error'
        };
        rateLimiter.__set__('RateLimits', rateLimitsDbMock);
        rateLimiter.__set__('PurchasedLimitsRedis', purchasedLimitsDbMock);
        rateLimiter.__set__('PurchasedLimitsPostgres', purchasedLimitsPostgresMock);

        rateLimiter.__set__('config', configMock);
    });

    it('should not block route for not recognized users', function (done) {
        // prepare
        delete req.identity;

        // execute
        rateLimiter.limit(req, res, next);

        // attest
        expect(res.send.called).to.equal(false);
        expect(next.calledWith()).to.equal(true);

        done();
    });

    describe('when user is recognized by using token', function() {

        it('for short path it should increase counter for that user', function (done) {
            // prepare
            rateLimitsDbMock.incrementCounter
                .withArgs(req.identity, req.path, req.method)
                .callsArgWith(3, success, rateLimitTuple);
            purchasedLimitsDbMock.getPurchasedLimitForRoute.callsArgWith(3, success, notPurchasedLimitTuple);

            // execute
            rateLimiter.limit(req, res, next);

            // attest
            expect(rateLimitsDbMock.incrementCounter.calledOnce).to.equal(true);
            expect(rateLimitsDbMock.incrementCounter.firstCall.args[0]).to.equal(req.identity);
            expect(res.send.called).to.equal(false);
            expect(next.calledWith()).to.equal(true);

            done();
        });

        it('for full path it should increase counter for account in route', function (done) {
            // prepare
            var accountId = rateLimitTuple.requesterId = uuid.v4();
            req.path = "/api/accounts/" + accountId + "/devices/.*";
            rateLimitTuple.route = "/api/accounts/.*/devices/.*";
            rateLimitTuple.method = req.method = "PUT";
            rateLimitsDbMock.incrementCounter
                .withArgs(accountId, rateLimitTuple.route, req.method).
                callsArgWith(3, success, rateLimitTuple);
            purchasedLimitsDbMock.getPurchasedLimitForRoute.callsArgWith(3, success, notPurchasedLimitTuple);

            // execute
            rateLimiter.limit(req, res, next);

            // attest
            expect(rateLimitsDbMock.incrementCounter.calledOnce).to.equal(true);
            expect(rateLimitsDbMock.incrementCounter.args[0][0]).to.equal(accountId);
            expect(res.send.called).to.equal(false);
            expect(next.called).to.equal(true);

            done();
        });

        it('should send limit information in headers', function (done) {
            // prepare
            var accountId = rateLimitTuple.requesterId = uuid.v4();
            req.path = "/api/accounts/" + accountId + "/devices/.*";
            rateLimitTuple.route = "/api/accounts/.*/devices/.*";
            rateLimitTuple.method = req.method = "PUT";
            rateLimitsDbMock.incrementCounter
                .withArgs(accountId, rateLimitTuple.route, req.method)
                .callsArgWith(3, success, rateLimitTuple);
            purchasedLimitsDbMock.getPurchasedLimitForRoute.callsArgWith(3, success, notPurchasedLimitTuple);

            // execute
            rateLimiter.limit(req, res, next);

            // attest
            expect(res.set.calledThrice).to.equal(true);
            expect(res.set.calledWith('X-Rate-Limit-Limit', fullPathLimit)).to.equal(true);
            expect(res.set.calledWith('X-Rate-Limit-Remaining', fullPathLimit - rateLimitTuple.hits)).to.equal(true);
            expect(res.set.thirdCall.args[1] <= hourInSeconds).to.equal(true);
            expect(next.calledWith()).to.equal(true);

            done();
        });

        it('should use limit from global config if no limit for route is specified', function (done) {
            // prepare
            req.path = rateLimitTuple.route = "/api/health";
            rateLimitsDbMock.incrementCounter
                .withArgs(req.identity, req.path, req.method)
                .callsArgWith(3, success, rateLimitTuple);
            purchasedLimitsDbMock.getPurchasedLimitForRoute.callsArgWith(3, success, notPurchasedLimitTuple);

            // execute
            rateLimiter.limit(req, res, next);

            // attest
            expect(res.set.calledThrice).to.equal(true);
            expect(res.set.firstCall.args[0]).to.equal('X-Rate-Limit-Limit');
            expect(res.set.firstCall.args[1]).to.equal(configMock.rateLimit);
            expect(res.set.secondCall.args[0]).to.equal('X-Rate-Limit-Remaining');
            expect(res.set.secondCall.args[1]).to.equal(configMock.rateLimit - rateLimitTuple.hits);
            expect(res.set.thirdCall.args[1] <= hourInSeconds).to.equal(true);
            expect(next.calledWith()).to.equal(true);

            done();
        });

        it('should return error if rateLimit tuple cannot be retrieved or it does not have required properties',
            function (done) {
                // prepare
                delete rateLimitTuple.hits;
                delete rateLimitTuple.created;
                rateLimitsDbMock.incrementCounter
                    .withArgs(req.identity, req.path, req.method)
                    .callsArgWith(3, success, rateLimitTuple);
                purchasedLimitsDbMock.getPurchasedLimitForRoute.callsArgWith(3, success, notPurchasedLimitTuple);

                // execute
                rateLimiter.limit(req, res, next);

                // attest
                expectResponseCode(internalServerError);
                expect(next.called).to.equal(false);

                done();
        });

        it('should return error if db error occured', function (done) {
            // prepare
            rateLimitsDbMock.incrementCounter.withArgs(req.identity, req.path, req.method).callsArgWith(3, dbError);
            purchasedLimitsDbMock.getPurchasedLimitForRoute.callsArgWith(3, success, notPurchasedLimitTuple);

            // execute
            rateLimiter.limit(req, res, next);

            // attest
            expectResponseCode(internalServerError);
            expect(next.called).to.equal(false);

            done();
        });

        it('should block user if limit has been exceeded', function (done) {
            // prepare
            rateLimitTuple.hits = shortPathLimit + 1;
            rateLimitsDbMock.incrementCounter.withArgs(req.identity, req.path, req.method).callsArgWith(3, success, rateLimitTuple);
            purchasedLimitsDbMock.getPurchasedLimitForRoute.callsArgWith(3, success, notPurchasedLimitTuple);

            // execute
            rateLimiter.limit(req, res, next);

            // attest
            expectResponseCode(tooManyRequests);
            expect(next.called).to.equal(false);

            done();
        });

        it('should apply purchased limit if exists and pass request', function (done) {
            // prepare
            rateLimitTuple.hits = shortPathLimit + 1;
            rateLimitsDbMock.incrementCounter.withArgs(req.identity, req.path, req.method).callsArgWith(3, success,rateLimitTuple);
            purchasedLimitsDbMock.getPurchasedLimitForRoute.callsArgWith(3, success, purchasedLimitTuple);

            // execute
            rateLimiter.limit(req, res, next);

            // attest
            expect(res.send.called).to.equal(false);
            expect(next.called).to.equal(true);

            done();
        });

        it('should apply purchased limit if exists and block request if exceeded', function (done) {
            // prepare
            rateLimitTuple.hits = purchasedLimitTuple + 1;
            rateLimitsDbMock.incrementCounter.withArgs(req.identity, req.path, req.method).callsArgWith(3, success, rateLimitTuple);
            purchasedLimitsDbMock.getPurchasedLimitForRoute.callsArgWith(3, success, purchasedLimitTuple);

            // execute
            rateLimiter.limit(req, res, next);

            // attest
            expectResponseCode(tooManyRequests);
            expect(next.called).to.equal(false);

            done();
        });
    });
});
