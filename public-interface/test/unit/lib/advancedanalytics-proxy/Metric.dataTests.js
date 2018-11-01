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

var assert =  require('chai').assert,
    rewire = require('rewire');
var fileToTest = "../../../../lib/advancedanalytics-proxy/Metric.data.js";

describe(fileToTest, function(){
    var toTest = rewire(fileToTest);
    var util = {
        data: 10234566789,
        newTimeStamp:  function () {
                return this.data;
        }
    };
    it('Shall Return Metric empty Object >', function(done) {
        var Metric  = toTest.init(util);
        var mMet = new Metric();
        assert.property(mMet, "accountId" , "The account id is required by MQTT AA");
        assert.property(mMet, "did", "The did (device) is require by MQTT AA");
        assert.property(mMet, "on", "The on (epoch time) is require by MQTT AA");
        assert.property(mMet, "count", "The count is require by MQTT AA");
        assert.equal(mMet.on, util.data, "The on is not the expected");
        assert.isArray(mMet.data, "The Data Array were not proper initialized");
        done();
    });
    it('Shall Convert Metric Obj to MQTT >', function(done) {
        var Metric  = toTest.init(util);
        var mMetricon = new Metric();
        var message = {
            accountId: "myAccount",
            on : 111122223334544566,
            componentId: "000-2223-5556-77877",
            deviceId: "myDeviceID",
            v: "myDDDD"
        };
        var mMet = mMetricon.prepareDataIngestionMsg(message);
        assert.equal(mMet.on, message.on, "The on is not the expected");
        assert.isArray(mMet.data, "The Data Array were not proper initialized");
        assert.lengthOf(mMet.data, 1, "The length of data is not the expected");
        var data = mMet.data[0];
        assert.equal(data.value, message.v, "The length of data is not the expected");
        assert.equal(data.on, message.on, "The length of data is not the expected");
        assert.equal(data.cid, message.componentId, "The length of data is not the expected");
        assert.notProperty(data, "attributes", "The attributes are not expected");
        assert.notProperty(data, "loc", "The loc are not expected");
        assert.lengthOf(mMet.data, mMet.count, "The length of data is not the expected");

        message = {
            accountId: "myAccount",
            on : 111122223334544566,
            cid: "000-2223-5556-77877-1111",
            deviceId: "myDeviceID2",
            value: "myDDDD2",
            loc: [11,22,44]
        };
        mMet = mMetricon.prepareDataIngestionMsg(message);
        assert.equal(mMet.on, message.on, "The on is not the expected");
        assert.isArray(mMet.data, "The Data Array were not proper initialized");
        assert.lengthOf(mMet.data, 1, "The length of data is not the expected");
        data = mMet.data[0];
        assert.equal(data.value, message.value, "The length of data is not the expected");
        assert.equal(data.on, message.on, "The length of data is not the expected");
        assert.equal(data.cid, message.cid, "The length of data is not the expected");
        assert.notProperty(data, "attributes", "The attributes are not expected");
        assert.property(data, "loc", "The loc are not expected");
        assert.lengthOf(mMet.data, mMet.count, "The length of data is not the expected");
        assert.deepEqual(data.loc, message.loc, "The location is missing");
        message = {
            accountId: "myAccount33",
            cid: "000-2223-5556-77877-22222234",
            deviceId: "myDeviceID3",
            value: "myDDDD2",
            loc: [11,22,44]
        };
        mMetricon = new Metric();
        mMet = mMetricon.prepareDataIngestionMsg(message);
        assert.equal(mMet.on, util.data, "The on is not the expected");
        assert.isArray(mMet.data, "The Data Array were not proper initialized");
        assert.lengthOf(mMet.data, 1, "The length of data is not the expected");
        data = mMet.data[0];
        assert.equal(data.value, message.value, "The length of data is not the expected");
        assert.equal(data.on, util.data, "The length of data is not the expected");
        assert.equal(data.cid, message.cid, "The length of data is not the expected");
        assert.notProperty(data, "attributes", "The attributes are not expected");
        assert.property(data, "loc", "The loc are not expected");
        assert.lengthOf(mMet.data, mMet.count, "The length of data is not the expected");
        assert.deepEqual(data.loc, message.loc, "The location is missing");
        done();
   });
    it('Shall Convert Metric Obj to MQTT using Data Array>', function(done) {
        var Metric  = toTest.init(util);
        var mMetricon = new Metric();
        var message = {
            accountId: "myAccount",
            on : 111122223334544566,
            deviceId: "myDeviceID",
            data: [{v: "myDDDD",
                    componentId: "000-2223-5556-77877",
                    on: 2222345565
                    },
                    {value: "valueDDDD",
                     cid: "000-2223-5556-77877",
                     loc: [1,2,4,5,6],
                     attributes: {v:'xx'}
                    }
                    ]
        };
        var mMet = mMetricon.prepareDataIngestionMsg(message);
        assert.equal(mMet.on, message.on, "The on is not the expected");
        assert.isArray(mMet.data, "The Data Array were not proper initialized");
        assert.lengthOf(mMet.data, message.data.length, "The length of data is not the expected");
        var data = mMet.data[0];
        assert.equal(data.value, message.data[0].v, "The length of data is not the expected");
        assert.equal(data.on, message.data[0].on, "The length of data is not the expected");
        assert.equal(data.cid, message.data[0].componentId, "The length of data is not the expected");
        assert.notProperty(data, "attributes", "The attributes are not expected");
        assert.notProperty(data, "loc", "The loc are not expected");
        assert.lengthOf(mMet.data, mMet.count, "The length of data is not the expected");
        data = mMet.data[1];
        assert.equal(data.value, message.data[1].value, "The length of data is not the expected");
        assert.equal(data.on, message.on, "The length of data is not the expected");
        assert.equal(data.cid, message.data[1].cid, "The length of data is not the expected");
        assert.property(data, "attributes", "The attributes are not expected");
        assert.property(data, "loc", "The loc are not expected");
        assert.deepEqual(data.loc, message.data[1].loc, "The loc are not expected");
        assert.deepEqual(data.attributes, message.data[1].attributes, "The loc are not expected");
        assert.lengthOf(mMet.data, mMet.count, "The length of data is not the expected");

        done();
    });
});
