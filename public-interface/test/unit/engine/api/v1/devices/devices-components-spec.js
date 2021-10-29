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
    errBuilder  = require("../../../../../../lib/errorHandler/index").errBuilder,
    Q = require('q'),
    devicesManager = rewire('../../../../../../engine/api/v1/devices');

describe('deviceApi.components', function() {

    describe('get components', function() {

        describe('all', function() {

            it('should return list of components', function(done) {
                // prepare
                var components = [ { cid: uuid.v4() } ],
                    mock = {
                        all: sinon.stub().callsArgWith(1, null, components)
                    },
                    accountId = uuid.v4(),
                    callback = sinon.spy();
                devicesManager.__set__('Components', mock);
                // execute
                devicesManager.getComponents(accountId, callback);
                // attest
                expect(mock.all.args[0][0]).to.equal(accountId);
                expect(callback.args[0][0]).to.equal(null);
                expect(callback.args[0][1]).to.equal(components);

                done();
            });

            it('should return component not found error when occured', function(done) {
                // prepare
                var error = new Error(500),
                    mock = {
                        all: sinon.stub().callsArgWith(1, error)
                    },
                    accountId = uuid.v4(),
                    callback = sinon.spy();
                devicesManager.__set__('Components', mock);

                // execute
                devicesManager.getComponents(accountId, callback);
                // attest
                expect(mock.all.args[0][0]).to.equal(accountId);
                expect(callback.args[0][0].code).to.equal(errBuilder.Errors.Device.Component.NotFound.code);
                expect(callback.args[0][0].status).to.equal(errBuilder.Errors.Device.Component.NotFound.status);

                done();
            });

        });

        describe('by custom filter', function() {

            it('should return list of components', function(done) {
                // prepare
                var components = [ { cid: uuid.v4() } ],
                    mock = {
                        getByCustomFilter: sinon.stub().callsArgWith(2, null, components)
                    },
                    accountId = uuid.v4(),
                    customFilter = { deviceIds: [ uuid.v4() ]},
                    callback = sinon.spy();
                devicesManager.__set__('Components', mock);
                // execute
                devicesManager.getComponentsByCustomFilter(accountId, customFilter, callback);
                // attest
                expect(mock.getByCustomFilter.args[0][0]).to.equal(accountId);
                expect(mock.getByCustomFilter.args[0][1]).to.equal(customFilter);
                expect(callback.args[0][0]).to.equal(null);
                expect(callback.args[0][1]).to.equal(components);

                done();
            });

            it('should return component not found error when occured', function(done) {
                // prepare
                var error = new Error(500),
                    mock = {
                        getByCustomFilter: sinon.stub().callsArgWith(2, error)
                    },
                    accountId = uuid.v4(),
                    customFilter = { deviceIds: [ uuid.v4() ]},
                    callback = sinon.spy();
                devicesManager.__set__('Components', mock);
                // execute
                devicesManager.getComponentsByCustomFilter(accountId, customFilter, callback);
                // attest
                expect(mock.getByCustomFilter.args[0][0]).to.equal(accountId);
                expect(mock.getByCustomFilter.args[0][1]).to.equal(customFilter);
                expect(callback.args[0][0].code).to.equal(errBuilder.Errors.Device.Component.NotFound.code);
                expect(callback.args[0][0].status).to.equal(errBuilder.Errors.Device.Component.NotFound.status);

                done();
            });

        });

    });

});
