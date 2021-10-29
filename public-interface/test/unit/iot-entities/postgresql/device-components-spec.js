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
    Q = require('q'),
    deviceComponentsMgr = rewire('../../../../iot-entities/postgresql/deviceComponents');

describe('iot-entities.deviceComponents', function() {

    describe('get components', function() {

        beforeEach(function () {
            var interpreterMock = {
                    toApp: function (item) { return item; }
            };
            deviceComponentsMgr.__set__('interpreter', interpreterMock);
        });

        describe('all', function() {

            it('should return list of components', function(done) {
                // prepare
                var components = [ { cid: uuid.v4() } ],
                    mock = {
                        all: sinon.stub().returns(Q.resolve(components))
                    },
                    accountId = uuid.v4();
                deviceComponentsMgr.__set__('deviceComponents', mock);
                // execute
                Q.nfcall(deviceComponentsMgr.all, accountId)
                    .then(function (result) {
                        // attest
                        expect(mock.all.args[0][0].include[0].as).to.equal('componentType');
                        expect(mock.all.args[0][0].include[1].attributes.length).to.equal(0);
                        expect(mock.all.args[0][0].include[1].where.$and.accountId).to.equal(accountId);

                        expect(result[0]).to.equal(components[0]);
                        done();
                    })
                    .catch(function (ex) {
                        done(ex);
                    });



            });

            it('should return component not found error when occured', function(done) {
                // prepare
                var error = new Error(500),
                    mock = {
                        all: sinon.stub().returns(Q.reject(error))
                    },
                    accountId = uuid.v4();
                deviceComponentsMgr.__set__('deviceComponents', mock);

                // execute
                Q.nfcall(deviceComponentsMgr.all, accountId)
                    .then(function () {
                        done('Error not thrown');
                    })
                    .catch(function (ex) {
                        // attest
                        expect(mock.all.args[0][0].include[0].as).to.equal('componentType');
                        expect(mock.all.args[0][0].include[1].attributes.length).to.equal(0);
                        expect(mock.all.args[0][0].include[1].where.$and.accountId).to.equal(accountId);

                        expect(ex).to.equal(error);
                        done();
                    })
                    .catch(function (ex) {
                        done(ex);
                    });
            });

        });

        describe('by custom filter', function() {

            it('should return list of components with ids from list', function(done) {
                // prepare
                var components = [ { cid: uuid.v4() } ],
                    mock = {
                        all: sinon.stub().returns(Q.resolve(components))
                    },
                    accountId = uuid.v4(),
                    customFilter = { componentIds: [ uuid.v4() ]};
                deviceComponentsMgr.__set__('deviceComponents', mock);
                // execute
                Q.nfcall(deviceComponentsMgr.getByCustomFilter, accountId, customFilter)
                    .then(function (result) {
                        // attest
                        expect(mock.all.args[0][0].include[0].as).to.equal('componentType');
                        expect(mock.all.args[0][0].include[1].attributes.length).to.equal(0);
                        expect(mock.all.args[0][0].include[1].where.$and.accountId).to.equal(accountId);
                        expect(mock.all.args[0][0].where.componentId.$in).to.equal(customFilter.componentIds);

                        expect(result[0]).to.equal(components[0]);

                        done()
                    })
                    .catch(function (ex) {
                        done(ex);
                    });
            });

            it('should return list of components from device with one of deviceIds', function(done) {
                // prepare
                var components = [ { cid: uuid.v4() } ],
                    mock = {
                        all: sinon.stub().returns(Q.resolve(components))
                    },
                    accountId = uuid.v4(),
                    customFilter = { deviceIds: [ uuid.v4() ]};
                deviceComponentsMgr.__set__('deviceComponents', mock);
                // execute
                Q.nfcall(deviceComponentsMgr.getByCustomFilter, accountId, customFilter)
                    .then(function (result) {
                        // attest
                        expect(mock.all.args[0][0].include[0].as).to.equal('componentType');
                        expect(mock.all.args[0][0].include[1].attributes.length).to.equal(0);
                        expect(mock.all.args[0][0].include[1].where.$and.accountId).to.equal(accountId);
                        expect(mock.all.args[0][0].include[1].where.$and.id.$in).to.equal(customFilter.deviceIds);

                        expect(result[0]).to.equal(components[0]);

                        done()
                    })
                    .catch(function (ex) {
                        done(ex);
                    });
            });

            it('should return list of components from device with one of deviceNames', function(done) {
                // prepare
                var components = [ { cid: uuid.v4() } ],
                    mock = {
                        all: sinon.stub().returns(Q.resolve(components))
                    },
                    accountId = uuid.v4(),
                    customFilter = { deviceNames: [ uuid.v4() ]};
                deviceComponentsMgr.__set__('deviceComponents', mock);
                // execute
                Q.nfcall(deviceComponentsMgr.getByCustomFilter, accountId, customFilter)
                    .then(function (result) {
                        // attest
                        expect(mock.all.args[0][0].include[0].as).to.equal('componentType');
                        expect(mock.all.args[0][0].include[1].attributes.length).to.equal(0);
                        expect(mock.all.args[0][0].include[1].where.$and.accountId).to.equal(accountId);
                        expect(mock.all.args[0][0].include[1].where.$and.name.$in).to.equal(customFilter.deviceNames);

                        expect(result[0]).to.equal(components[0]);

                        done()
                    })
                    .catch(function (ex) {
                        done(ex);
                    });
            });

            it('should return list of components from device with one of deviceIds and deviceNames', function(done) {
                // prepare
                var components = [ { cid: uuid.v4() } ],
                    mock = {
                        all: sinon.stub().returns(Q.resolve(components))
                    },
                    accountId = uuid.v4(),
                    customFilter = { deviceIds: [ uuid.v4() ], deviceNames: [ uuid.v4() ]};
                deviceComponentsMgr.__set__('deviceComponents', mock);
                // execute
                Q.nfcall(deviceComponentsMgr.getByCustomFilter, accountId, customFilter)
                    .then(function (result) {
                        // attest
                        expect(mock.all.args[0][0].include[0].as).to.equal('componentType');
                        expect(mock.all.args[0][0].include[1].attributes.length).to.equal(0);
                        expect(mock.all.args[0][0].include[1].where.$and.accountId).to.equal(accountId);
                        expect(mock.all.args[0][0].include[1].where.$and.id.$in).to.equal(customFilter.deviceIds);
                        expect(mock.all.args[0][0].include[1].where.$and.name.$in).to.equal(customFilter.deviceNames);

                        expect(result[0]).to.equal(components[0]);

                        done()
                    })
                    .catch(function (ex) {
                        done(ex);
                    });
            });

            it('should return list of components from device with one of gatewayIds', function(done) {
                // prepare
                var components = [ { cid: uuid.v4() } ],
                    mock = {
                        all: sinon.stub().returns(Q.resolve(components))
                    },
                    accountId = uuid.v4(),
                    customFilter = { gatewayIds: [ uuid.v4() ]};
                deviceComponentsMgr.__set__('deviceComponents', mock);
                // execute
                Q.nfcall(deviceComponentsMgr.getByCustomFilter, accountId, customFilter)
                    .then(function (result) {
                        // attest
                        expect(mock.all.args[0][0].include[0].as).to.equal('componentType');
                        expect(mock.all.args[0][0].include[1].attributes.length).to.equal(0);
                        expect(mock.all.args[0][0].include[1].where.$and.accountId).to.equal(accountId);
                        expect(mock.all.args[0][0].include[1].where.$and.gatewayId.$in).to.equal(customFilter.gatewayIds);

                        expect(result[0]).to.equal(components[0]);

                        done()
                    })
                    .catch(function (ex) {
                        done(ex);
                    });
            });

            it('should return list of components from device with one of deviceTags', function(done) {
                // prepare
                var components = [ { cid: uuid.v4() } ],
                    mock = {
                        all: sinon.stub().returns(Q.resolve(components))
                    },
                    accountId = uuid.v4(),
                    customFilter = { deviceTags: [ uuid.v4() ]};
                deviceComponentsMgr.__set__('deviceComponents', mock);
                // execute
                Q.nfcall(deviceComponentsMgr.getByCustomFilter, accountId, customFilter)
                    .then(function (result) {
                        // attest
                        expect(mock.all.args[0][0].include[0].as).to.equal('componentType');
                        expect(mock.all.args[0][0].include[1].attributes.length).to.equal(0);
                        expect(mock.all.args[0][0].include[1].where.$and.accountId).to.equal(accountId);
                        expect(mock.all.args[0][0].include[1].include[0].as).to.equal('tags');
                        expect(mock.all.args[0][0].include[1].include[0].where.value.$in).to.equal(customFilter.deviceTags);
                        expect(mock.all.args[0][0].include[1].include[0].attributes.length).to.equal(0);

                        expect(result[0]).to.equal(components[0]);

                        done()
                    })
                    .catch(function (ex) {
                        done(ex);
                    });
            });

            it('should return component not found error when occured', function(done) {
                // prepare
                var error = new Error(500),
                    mock = {
                        all: sinon.stub().returns(Q.reject(error))
                    },
                    accountId = uuid.v4(),
                    customFilter = { deviceIds: [ uuid.v4() ]};
                deviceComponentsMgr.__set__('deviceComponents', mock);
                // execute
                Q.nfcall(deviceComponentsMgr.getByCustomFilter, accountId, customFilter)
                    .then(function () {
                        done('Error not thrown');
                    })
                    .catch(function (ex) {
                        // attest
                        expect(mock.all.args[0][0].include[0].as).to.equal('componentType');
                        expect(mock.all.args[0][0].include[1].attributes.length).to.equal(0);
                        expect(mock.all.args[0][0].include[1].where.$and.accountId).to.equal(accountId);
                        expect(mock.all.args[0][0].include[1].where.$and.id.$in).to.equal(customFilter.deviceIds);

                        expect(ex).to.equal(error);
                        done()
                    });
            });

        });

    });

});
