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
    timeManager = rewire('../../../../../engine/api/v1/time'),
    errBuilder = require('../../../../../lib/errorHandler').errBuilder;

describe('time api', function() {

    describe('getActualTime', function() {
        it('should call callback with actual time in valid data format', function(done) {
            // valid format 'yyyy-mm-dd hh:mm:ss'

            // prepare
            var callback = sinon.spy(),
                regExp = new RegExp("^[1-9][0-9]{3}-[01][0-9]-[0-3][0-9] [0-2][0-9]:[0-5][0-9]:[0-5][0-9]"),
                time;

            // execute
            timeManager.getActualTime(callback);
            time = callback.lastCall.args[1];

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.calledWith(null, time)).to.equal(true);
            expect(regExp.test(time)).to.equal(true);

            done();
        });
        it('should call callback with error 14400 if no data received', function(done) {
            // prepare
            var time = null,
                timeMock =  function() {
                    return time;
                },
                error = errBuilder.build(errBuilder.Errors.Time.DateReceiveError),
                errorObj = { msg: error.msg, business: error.business, status: error.status, code: error.code },
                callback = sinon.spy();

            timeManager.__set__('actualTime', timeMock);

            // execute
            timeManager.getActualTime(callback);

            // attest
            expect(callback.calledOnce).to.equal(true);
            expect(callback.calledWith(sinon.match(errorObj))).to.equal(true);

            done();
        });
    });
});