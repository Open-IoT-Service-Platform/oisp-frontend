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

var expect = require('chai').expect,
    sinon = require('sinon'),
    rewire = require('rewire'),
    uuid = require('uuid'),
    helper = require('../../../../lib/interpreter/helper');

describe('helper.isObject', function() {

    it('should return true if value is an object', function (done) {
        //execute
        var result = helper.isObject({});

        //attest
        expect(result).to.equal(true);
        done();
    });
    it('should return false if value is an array', function (done) {
        //execute
        var result = helper.isObject([]);

        //attest
        expect(result).to.equal(false);
        done();
    });
    it('should return true if value is an int', function (done) {
        //execute
        var result = helper.isObject(1);

        //attest
        expect(result).to.equal(false);
        done();
    });
    it('should return true if value is a string', function (done) {
        //execute
        var result = helper.isObject("string");

        //attest
        expect(result).to.equal(false);
        done();
    });
});

describe('helper.asAppId', function() {

    it('should return stringified id if id exists', function (done) {
        //execute
        var result = helper.asAppId({id: 17});

        //attest
        expect(result.id).to.equal('17');
        done();
    });
    it('should return unchanged entity if no id contained in body', function (done) {
        //execute
        var result = helper.asAppId({notId: 17});

        //attest
        expect(result.notId).to.equal(17);
        expect(result.id).to.equal(undefined);
        done();
    });
});

describe('helper.removeDbId', function() {

    it('should delete _id from object', function (done) {
        //execute
        var result = helper.removeDbId({_id: 16});

        //attest
        expect(result._id).to.equal(undefined);
        done();
    });
});

describe('helper.translate', function() {
    var idProcessor;

    beforeEach(function(){
        idProcessor = sinon.stub();
    });

    it('should return empty object if entity is empty and idProcessor not provided', function(done){
        //arrange
        var lookUpTable = {}, entity = [];

        //execute
        var result = helper.translate(lookUpTable, entity);

        //attest
        expect(result).to.deep.equal({});
        done();
    });


    it('should call idProcessor function on empty object if entity is empty and idProcessor provided', function(done){
        //arrange
        var lookUpTable = {}, entity = [];

        //execute
        helper.translate(lookUpTable, entity, idProcessor);

        //attest
        expect(idProcessor.calledOnce).to.equal(true);
        expect(idProcessor.calledWith({})).to.equal(true);

        done();
    });

    it('should return entity if not found in lookupTable and are not array', function(done){
        //arrange
        var lookUpTable = {
            _id: "table_id",
            _name: "table_name"
        }, entity = {
            id: "id1",
            name: "name1"
        };

        //execute
        var result = helper.translate(lookUpTable, entity);

        //attest
        expect(result.id).to.equal("id1");
        expect(result.name).to.equal("name1");

        done();
    });

    it('should return translated entity to lookup table for key value pair', function(done){
        //arrange
        var lookUpTable = {
            id: "table_id",
            name: "table_name"
        }, entity = {
            id: "id1",
            name: "name1"
        };

        //execute
        var result = helper.translate(lookUpTable, entity);

        //attest
        expect(result.table_id).to.equal("id1");
        expect(result.table_name).to.equal("name1");

        done();
    });

    it('should return deeply translated entity with object to lookup table for object', function(done){
        //arrange
        var lookUpTable = {
            id: "table_id",
            name: "table_name",
            component: {
                id: "c_table_id",
                name: "c_table_name"
            }
        }, entity = {
            id: "id1",
            name: "name1",
            component: {
                id: "c1",
                name: "c_name1"
            }
        };

        //execute
        var result = helper.translate(lookUpTable, entity);

        //attest
        expect(result.table_id).to.equal("id1");
        expect(result.table_name).to.equal("name1");
        expect(result.component.c_table_id).to.equal("c1");
        expect(result.component.c_table_name).to.equal("c_name1");

        done();
    });

    it('should call idProcesor for each translated object and at the end', function(done){
        //arrange
        var lookUpTable = {
            id: "table_id",
            name: "table_name",
            component: {
                id: "c_table_id",
                name: "c_table_name"
            },
            attribute: {
                id: "a_table_id",
                name: "a_table_name"
            }
        }, entity = {
            id: "id1",
            name: "name1",
            component: {
                id: "c1",
                name: "c_name1"
            },
            attribute: {
                id: "a1",
                name: "a_name1"
            }
        };

        //execute
        helper.translate(lookUpTable, entity, idProcessor);

        //attest
        expect(idProcessor.calledThrice).to.equal(true);

        done();
    });


    it('should return deeply translated entity with object to lookup table for array', function(done){
        //arrange
        var lookUpTable = {
            id: "table_id",
            name: "table_name",
            components: [{
                id: "c_table_id",
                name: "c_table_name"
            }]
        }, entity = {
            id: "id1",
            name: "name1",
            components: [
                {
                    id: "c1",
                    name: "c_name1"
                },
                {
                    id: "c2",
                    name: "c_name2"
                }
            ]
        };

        //execute
        var result = helper.translate(lookUpTable, entity);

        //attest
        expect(result.table_id).to.equal("id1");
        expect(result.table_name).to.equal("name1");
        expect(result.components.length).to.equal(2);
        expect(result.components[1].c_table_id).to.equal("c2");
        expect(result.components[1].c_table_name).to.equal("c_name2");

        done();
    });

    it('should return deeply translated entity with object to lookup table for array', function(done){
        //arrange
        var lookUpTable = {
            id: "table_id",
            name: "table_name",
            components: [{
                id: "c_table_id",
                name: "c_table_name"
            }]
        }, entity = {
            id: "id1",
            name: "name1",
            components: [
                {
                    id: "c1",
                    name: "c_name1"
                },
                {
                    id: "c2",
                    name: "c_name2"
                }
            ]
        };

        //execute
        var result = helper.translate(lookUpTable, entity);

        //attest
        expect(result.table_id).to.equal("id1");
        expect(result.table_name).to.equal("name1");
        expect(result.components.length).to.equal(2);
        expect(result.components[1].c_table_id).to.equal("c2");
        expect(result.components[1].c_table_name).to.equal("c_name2");

        done();
    });

    it('should leave array wher pairing table object with entity array', function(done){
        //arrange
        var lookUpTable = {
            id: "table_id",
            name: "table_name",
            components: [{
                id: "c_table_id",
                name: "c_table_name"
            }]
        }, entity = {
            id: "id1",
            name: "name1",
            components: [
                "c1", "c2"
            ]
        };
        //execute
        var result = helper.translate(lookUpTable, entity);

        //attest
        expect(result.table_id).to.equal("id1");
        expect(result.table_name).to.equal("name1");
        expect(result.components.length).to.equal(2);
        expect(result.components[1]).to.equal("c2");

        done();
    });

    it('should leave object when pairing entity object with table array', function(done){
        //arrange
        var lookUpTable = {
            id: "table_id",
            name: "table_name",
            components: [{
                id: "c_table_id",
                name: "c_table_name"
            }]
        }, entity = {
            id: "id1",
            name: "name1",
            components: {
                id: "c1",
                name: "c_name1"
            }
        };

        //execute
        var result = helper.translate(lookUpTable, entity);

        //attest
        expect(result.table_id).to.equal("id1");
        expect(result.table_name).to.equal("name1");
        expect(result.components.id).to.equal("c1");
        expect(result.components.name).to.equal("c_name1");

        done();
    });
});

describe('helper.inverse', function() {
   it("should inverse inside object", function(done){
       //prepare
       var lookUpTable = {
           insideObject:{
               name: [{name_new:"name_new_key"}],
               id:"id_new_key"
           }
       };

       //execute
       var result = helper.inverse(lookUpTable);

       //assert
       expect(result.insideObject.id_new_key).to.equal("id");
       expect(result.insideObject.name[0].name_new_key).to.equal("name_new");
       done();
   });
});

describe('helper.mapAppResults', function() {
    var callback, interpreter;

    beforeEach(function () {
        callback = sinon.stub();
        interpreter = {
            toApp: sinon.stub()
        };
    });

    it('should return null if result and callback not provided', function (done) {
        //execute
        var mappedResult = helper.mapAppResults();

        //attest
        expect(mappedResult).to.equal(null);

        done();
    });

    it('should call interpreter.toApp on result and return its result if result is not array and callback not provided', function (done) {
        //prepare
        var result = "test";
        interpreter.toApp.returns("testMapped");

        //execute
        var mappedResult = helper.mapAppResults(result, interpreter);

        //attest
        expect(interpreter.toApp.calledWith(result)).to.equal(true);
        expect(interpreter.toApp.calledOnce).to.equal(true);
        expect(mappedResult).to.equal("testMapped");

        done();
    });

    it('should call interpreter.toApp on result and callback its result if result is not array and callback provided', function (done) {
        //prepare
        var result = "test";
        interpreter.toApp.returns("testMapped");
        //execute
        helper.mapAppResults(result, interpreter, callback);

        //attest
        expect(interpreter.toApp.calledWith(result)).to.equal(true);
        expect(interpreter.toApp.calledOnce).to.equal(true);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.calledWith(null, "testMapped")).to.equal(true);

        done();
    });

    it('should call interpreter.toApp on each element of result and return array if callback not provided', function (done) {
        //prepare
        var result = ["test1", "test2"];
        interpreter.toApp.withArgs("test1").returns("testMapped1");
        interpreter.toApp.withArgs("test2").returns("testMapped2");

        //execute
        var mappedResult = helper.mapAppResults(result, interpreter);

        //attest
        expect(interpreter.toApp.calledTwice).to.equal(true);
        expect(mappedResult[0]).to.equal("testMapped1");
        expect(mappedResult[1]).to.equal("testMapped2");

        done();
    });

});
