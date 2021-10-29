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


var expect = require('chai').expect,
    sinon = require('sinon'),
    rewire = require('rewire'),
    Q = require('q'),
    deviceManager = rewire('../../../../../engine/api/helpers/deviceManager'),
    errBuilder = require("../../../../../lib/errorHandler").errBuilder,
    uuid = require('uuid');


describe("device manager is device active", function () {
    it("should return true if device is active", function(done){
        //prepare
        var device = {status: "active"};

        //execute
        var result = deviceManager.isDeviceActive(device);

        //attest
        expect(result).to.equal(true);
        done();
    });

    it("should return false if device is created", function(done){
        //prepare
        var device = {status: "created"};

        //execute
        var result = deviceManager.isDeviceActive(device);

        //attest
        expect(result).to.equal(false);
        done();
    });
});

describe("device manager isDeviceRegisteredInAccount", function () {
    it("should return device if not active", function(done){
        //prepare
        var account = {
                devices :[
                    {
                        deviceId: 1,
                        name: "name"
                    },
                    {
                        deviceId: 2,
                        name: "name2"
                    }
                ]
            },
            deviceId = 1;

        //execute
        deviceManager.isDeviceRegisteredInAccount(deviceId, account)
            .then(function(result){
                //attest
                expect(result.name).to.equal("name");
                done();
            }).catch(function(error){
                done(error);
            });
    });

    it("should return null when device id not exists in account", function(done){
        //prepare
        var account = {
                devices :[
                    {
                        deviceId: 1,
                        name: "name"
                    }
                ]
            },
            deviceId = 2;

        //execute
        deviceManager.isDeviceRegisteredInAccount(deviceId, account)
            .then(function(result){
                //attest
                expect(result).to.equal(null);
                done();
            }).catch(function(error){
                done(error);
            });
    });

    it("should return errBuilder.Errors.Device.AlreadyExists device if not active", function(done){
        //prepare
        var account = {
                devices :[
                    {
                        deviceId: 1,
                        name: "name",
                        status: "active"
                    }
                ]
            },
            deviceId = 1;

        //execute
        deviceManager.isDeviceRegisteredInAccount(deviceId, account)
            .catch(function(error){
                expect(error).to.equal(errBuilder.Errors.Device.AlreadyExists);
                done();
            });
    });

});

describe("device manager findTypesWithoutDefinition", function () {
    it("should return empty object for empty types", function (done) {
        //prepare
        var types = [], componentDefinitions=[];

        //execute
        var result = deviceManager.findTypesWithoutDefinition(types, componentDefinitions);

        //attest
        expect(result).to.deep.equal({});
        done();
    });

    it("should return empty object if type exists in definition", function (done) {
        //prepare
        var types = [
                "type1"
            ],
            componentDefinitions=[
                {id: "type1"}
            ];

        //execute
        var result = deviceManager.findTypesWithoutDefinition(types, componentDefinitions);

        //attest
        expect(result).to.deep.equal({});
        done();
    });

    it("should return type object if type not exists in definition", function (done) {
        //prepare
        var types = [
                "type1", "type2"
            ],
            componentDefinitions=[
                {id: "type1"}
            ];

        //execute
        var result = deviceManager.findTypesWithoutDefinition(types, componentDefinitions);

        //attest
        expect(result).to.deep.equal({"type2": true});
        done();
    });
});

describe("device manager setComponentTypeId", function () {
    it("should return empty array for empty components", function (done) {
        //prepare
        var components=[],componentsType=[];

        //execute
        var result = deviceManager.setComponentTypeId(components, componentsType);

        //attest
        expect(result).to.deep.equal([]);
        done();
    });

    it("should set componentTypeId to proper component type", function (done) {
        //prepare
        var components=[
                {
                    type: "type1"
                }
        ],
        componentsType=[
            {
                id: "type1",
                _id: "db_id"
            },
            {
                id: "type2",
                _id: "db_id2"
            }
        ];

        //execute
        var result = deviceManager.setComponentTypeId(components, componentsType);

        //attest
        expect(result[0].componentTypeId).to.equal("db_id");
        done();
    });

    it("should return components without component type if type not found", function (done) {
        //prepare
        var components=[
                {
                    type: "type3"
                }
            ],
            componentsType=[
                {
                    id: "type1",
                    _id: "db_id"
                },
                {
                    id: "type2",
                    _id: "db_id2"
                }
            ];

        //execute
        var result = deviceManager.setComponentTypeId(components, componentsType);

        //attest
        expect(result[0].componentTypeId).to.equal(undefined);
        done();
    });
});

describe("device manager removeComponentTypeId", function () {
    it("should return empty array for empty components", function (done) {
        //prepare
        var components=[];

        //execute
        var result = deviceManager.removeComponentTypeId(components);

        //attest
        expect(result).to.deep.equal([]);
        done();
    });

    it("should delete componentTypeId from components", function (done) {
        //prepare
        var components=[
                {
                    type: "type1",
                    componentTypeId: "db_id"
                }
            ];

        //execute
        var result = deviceManager.removeComponentTypeId(components);

        //attest
        expect(result[0].componentTypeId).to.equal(undefined);
        done();
    });
});
