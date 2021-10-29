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
    errBuilder  = require("../../../../../../lib/errorHandler/index").errBuilder,
    uuid = require('uuid'),
    Q = require('q'),
    devicesManager = rewire('../../../../../../engine/api/v1/devices');

describe('devicesApi.addComponents', function () {
    var existingComponentType, existingComponentTypes, component, components, deviceMock;

    var accountId, existingDevice, existingDeviceNoComponents, deviceManagerMock, postgresProviderMock, rolbackDone;

    function assertPostgressTransactionSucceded(){
        assertTransactionRollbackIs(false);
    }

    function assertPostgressTransactionFailed(){
        assertTransactionRollbackIs(true);
    }

    function assertTransactionRollbackIs(rollbackExpected){
        rollbackExpected = rollbackExpected || false;
        var commitExpected = !rollbackExpected;
        expect(postgresProviderMock.startTransaction.calledOnce).to.be(true);
        expect(postgresProviderMock.rollback.calledOnce).to.be(rollbackExpected);
        expect(postgresProviderMock.commit.calledOnce).to.be(commitExpected);
    }

    beforeEach(function () {
        existingComponentType = [
            {
                type: 'temperature.v1.0'
            }
        ];
        existingComponentTypes = [
            {
                type: 'temperature.v1.0'
            },
            {
                type: 'humidity.v1.0'
            }
        ];
        component = {
            id: 'temperature.v1.0',
            type: 'temperature.v1.0'
        };
        components = [
            {
                cid: 'comp1',
                name: 'temp1',
                type: 'temperature.v1.0'
            },
            {
                cid: 'comp2',
                name: 'humid',
                type: 'humidity.v1.0'
            },
            {
                cid: 'comp3',
                name: 'temp2',
                type: 'temperature.v1.0'
            }
        ];

        existingDevice = {
            deviceId: 1,
            components: [
                {
                    cid: '01',
                    name: '01'
                },
                {
                    cid: '02',
                    name: '02'
                }
            ],
            domainId: uuid.v4(),
            status: 'active'
        };
        existingDeviceNoComponents = {
            deviceId: 1,
            domainId: existingDevice.domainId
        };
        accountId = existingDevice.domainId;

        deviceMock = {
            addComponents: sinon.stub().returns(Q.resolve(existingDevice)),
            findByIdAndAccount: sinon.stub().returns(Q.resolve(existingDevice))
        };

        deviceManagerMock = {
            setComponentTypeId: sinon.stub(),
            isDeviceActive: function(obj){
                return obj.deviceId !== undefined;
            },
            removeComponentTypeId: sinon.stub()
        };

        rolbackDone = sinon.stub().callsArgWith(0,null);

        postgresProviderMock = {
            commit: sinon.stub().returns(Q.resolve()),
            startTransaction: sinon.stub().returns(Q.resolve()),
            rollback: sinon.stub().returns({
                done: sinon.stub().returns(Q.resolve())
            })
        };

        deviceManagerMock.setComponentTypeId.withArgs([component], existingComponentTypes).returns([component]);
        deviceManagerMock.setComponentTypeId.withArgs(components, existingComponentTypes).returns(components);

        deviceManagerMock.removeComponentTypeId.withArgs([component]).returns([component]);
        deviceManagerMock.removeComponentTypeId.withArgs(components).returns(components);


        devicesManager.__set__('postgresProvider', postgresProviderMock);
        devicesManager.__set__('Device', deviceMock);
        devicesManager.__set__('deviceManager', deviceManagerMock);

    });

    it('should add a component if it does not exist', function (done) {
        // prepare

        // execute
        devicesManager.addComponents(existingDevice.deviceId, component, accountId)
            .then(function(){
                // attest
                assertPostgressTransactionSucceded();

                expect(deviceMock.addComponents.calledWith([component])).to.equal(true);
                done();
            }).catch(function(error){
                done(error);
            });
    });

    it('should add multiple components if they do not exist', function (done) {
        // prepare
        var callback = sinon.spy();
        // execute
        devicesManager.addComponents(existingDevice.deviceId, components, accountId)
            .then(function(){
                // attest
                assertPostgressTransactionSucceded();

                expect(deviceMock.addComponents.calledWith(components)).to.equal(true);
                done();
            })
            .catch(function(error){
                done(error);
            });
    });

    it('should return object if array with one element was sent', function (done) {
        // prepare
        // execute
        devicesManager.addComponents(existingDevice.deviceId, component, accountId)
            .then(function(){
                // attest
                assertPostgressTransactionSucceded();

                done();
            })
            .catch(function(error){
                done(error);
            });
    });


    it('should not add a component if it does exist', function (done) {
        // prepare
        deviceMock.addComponents.returns(Q.reject(errBuilder.Errors.Device.Component.AlreadyExists));
        // execute
        devicesManager.addComponents(existingDevice.deviceId, component, accountId)
            .then(function(){
                // attest
                assertPostgressTransactionFailed();
                done();
            })
            .catch(function(error){
                done(error);
            });
    });


    it('should not add components with the same cid', function (done) {
        // prepare
        var callback = sinon.spy(),
            comps = [
            {
                cid: 'theSame',
                name: 'n01',
                type: 'temperature.v1.0'
            },
            {
                cid: 'theSame',
                name: 'n01',
                type: 'temperature.v1.0'
            }
        ];
        deviceMock.addComponents.returns(Q.reject(errBuilder.Errors.Device.Component.AlreadyExists));


        // execute
        devicesManager.addComponents(existingDevice.deviceId, comps, accountId)
            .then(function(){
                done();
            })
            .catch(function(error){

                expect(error.code).to.be.equal(errBuilder.Errors.Device.Component.IdsNotUnique.code);
                done();
            });
    });

    it('should not add components if one of component types is not found ', function (done) {
        // prepare
        var callback = sinon.spy(),
        componentsWithNewType = [
            {
                cid: 'comp1',
                name: 'temp1',
                type: 'temperature.v3.0'
            },
            {
                cid: 'comp2',
                name: 'temp2',
                type: 'temperature.v1.0'
            }
        ],
            msg = 'temperature.v3.0';

        deviceMock.addComponents.returns(Q.reject(errBuilder.Errors.Device.Component.TypeNotFound));

        // execute
        devicesManager.addComponents(existingDevice.deviceId, componentsWithNewType, accountId)
            .then(function(){
                assertPostgressTransactionFailed();
                done();
            });


    });

    it('should not add a component if the device does not exist', function (done) {
        // prepare
        deviceMock.addComponents.returns(Q.reject(errBuilder.Errors.Device.NotFound));
        // execute
        devicesManager.addComponents(existingDevice.deviceId, component, accountId)
            .then(function(){
                // attest
                assertPostgressTransactionFailed();
                done();
            })
            .catch(function(error){
                done(error);
            });
    });
});
