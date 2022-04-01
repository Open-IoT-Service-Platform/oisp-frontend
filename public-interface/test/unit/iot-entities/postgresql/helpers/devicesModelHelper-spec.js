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
    errBuilder = require('../../../../../lib/errorHandler/index').errBuilder,
    uuid = require('uuid'),
    deviceModelHelper = require('../../../../../iot-entities/postgresql/helpers/devicesModelHelper'),
    Q = require('q');

describe("device model helper formatDeviceAttributes",function(){
        it("should return device attributes object list for device", function(done){
            //prepare
            var attributes = {
                attribute1:"value1",
                attribute2:"value2",
                attribute3:"value3"
            },
            deviceUID = 1;
            //act
            var result = deviceModelHelper.formatDeviceAttributes(attributes, deviceUID);
            //assert
            expect(result.length).to.be(3);
            expect(result[1].key).to.be("attribute2");
            expect(result[1].value).to.be("value2");
            expect(result[1].deviceUID).to.be(1);
            done();
        });
});

describe("device model helper formatDeviceTags",function(){
    it("should return device tags object list for device", function(done){
        //prepare
        var tags = ["tag1", "tag2", "tag3"],
            deviceUID = 1;
        //act
        var result = deviceModelHelper.formatDeviceTags(tags, deviceUID);
        //assert
        expect(result.length).to.be(3);
        expect(result[1].value).to.be("tag2");
        expect(result[1].deviceUID).to.be(1);
        done();
    });
});

describe("device model helper formatDeviceComponents",function(){
    it("should return device components object list for device", function(done){
        //prepare
        var components = [
            {
                cid:1,
                name:"name1",
                deviceId:"dev1",
                type: "type1"
            },
            {
                cid:2,
                name:"name2",
                deviceId:"dev2",
                type: "type2"
            }
        ];
        var expectedResult = '{"(1,name1,type1,dev1)","(2,name2,type2,dev2)"}';
        //act
        var result = deviceModelHelper.formatDeviceComponents(components);
        //assert
        expect(result.length).to.be(expectedResult.length);
        expect(result).to.be(expectedResult);
        done();
    });
});

describe("device model helper createTotalsResponse",function(){
    it("should return total object from statistic", function(done){
        //prepare
        var statistics = {
                activeDevices: 10,
                createdDevices: 11,
                allDevices: 21,
                currentDevices: 21
        },
        expected ={
            state: {
                active: {
                    total: 10
                },
                created: {
                    total: 11
                },
                total: 21
            },
            total: 21,
            current: 21
        };

        //act
        var result = deviceModelHelper.createTotalsResponse(statistics);

        //assert
        expect(JSON.stringify(result)).to.be(JSON.stringify(expected));
        done();
    });
});
