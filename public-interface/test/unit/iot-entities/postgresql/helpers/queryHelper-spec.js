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
    errBuilder = require('../../../../../lib/errorHandler/index').errBuilder,
    uuid = require('uuid'),
    queryHelper = require('../../../../../iot-entities/postgresql/helpers/queryHelper'),
    Q = require('q'),
    callback;

function assertCallbackSucceded(){
    expect(callback.calledOnce).to.equal(true);
    expect(callback.args[0].length).to.equal(2);
    expect(callback.args[0][0]).to.equal(null);
}

function assertResultInCallbackIsEqualTo(expected){
    var result = callback.args[0][1];
    expect(result).to.equal(expected);
}

function assertResultObjectInCallbackIsEqualToObject(expected){
    var result = callback.args[0][1];
    expect(result).to.deep.equal(expected);
}

describe("query helper parseFiltersToSql",function(){

    beforeEach(function(){
        callback = sinon.spy();
    });

    it("should return callback with order by asc as default if filter has sort", function(done){
        //arrange
        var filters = {
                sort: "name"
            },
            attributes = {
                name: {
                    fieldName: "name"
                }
            };

        //act
        queryHelper.parseFiltersToSql(filters, attributes, callback);

        //assert
        assertCallbackSucceded();
        assertResultInCallbackIsEqualTo(' ORDER BY "name"ASC');

        done();
    });

    it("should return callback with order by desc if filter has sort and order desc", function(done){
        //arrange
        var filters = {
                sort: "name",
                order: "desc"
            },
            attributes = {
                name: {
                    fieldName: "name"
                }
            };

        //act
        queryHelper.parseFiltersToSql(filters, attributes, callback);

        //assert
        assertCallbackSucceded();
        assertResultInCallbackIsEqualTo(' ORDER BY "name"DESC');
        done();
    });

    it("should return callback with limit if filter has limit", function(done){
        //arrange
        var filters = {
                limit: 1
            },
            attributes = {};

        //act
        queryHelper.parseFiltersToSql(filters, attributes, callback);

        //assert
        assertCallbackSucceded();
        assertResultInCallbackIsEqualTo(' LIMIT 1');
        done();
    });

    it("should return callback with offset if filter has skip", function(done){
        //arrange
        var filters = {
                skip: 1
            },
            attributes = {};

        //act
        queryHelper.parseFiltersToSql(filters, attributes, callback);

        //assert
        assertCallbackSucceded();
        assertResultInCallbackIsEqualTo(' OFFSET 1');
        done();
    });

    it("should return callback with order,limit, skip if filter has those options", function(done){
        //arrange
        var filters = {
                sort: "name",
                limit: 10,
                skip: 2
            },
            attributes = {
                name: {
                    fieldName: "name"
                }
            };

        //act
        queryHelper.parseFiltersToSql(filters, attributes, callback);

        //assert
        assertCallbackSucceded();
        assertResultInCallbackIsEqualTo(' ORDER BY "name"ASC LIMIT 10 OFFSET 2');
        done();
    });

    it("should return empty string if no filters provided and delete _ ", function(done){
        //arrange
        var filters = {
                _: "test"
            },
            attributes = {

            };

        //act
        queryHelper.parseFiltersToSql(filters, attributes, callback);

        //assert
        assertCallbackSucceded();
        assertResultInCallbackIsEqualTo(null);
        expect(filters._).to.equal(undefined);
        done();
    });
});

describe("query helper joinQueries",function(){
    it("should return empty string for empty list", function(done){
        //arrange
        var queryFields = [];
        //act
        var result = queryHelper.joinQueries(queryFields);

        //assert
        expect(result).to.equal(null);
        done();
    });

    it("should return empty string for empty queries", function(done){
        //arrange
        var queryFields = ["",""];
        //act
        var result = queryHelper.joinQueries(queryFields);

        //assert
        expect(result).to.equal('');
        done();
    });

    it("should return empty string for empty queries", function(done){
        //arrange
        var queryFields = ["", "proper query1","","proper query2", ""];
        var expectedResult = "proper query1 AND proper query2";
        //act
        var result = queryHelper.joinQueries(queryFields);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

});

describe("query helper parsePropertiesQuery", function(){
    it("should return exist query for device id when operator exists is true", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "exists",
                value: true
            };

        var expectedResult = 'EXISTS (SELECT id FROM device WHERE  "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parsePropertiesQuery(properties, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return not exist query for device id when operator exists is false", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "exists",
                value: false
            };

        var expectedResult = ' NOT EXISTS (SELECT id FROM device WHERE  "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parsePropertiesQuery(properties, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return null if value is empty object", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "eq",
                value: {
                }
            };

        //act
        var result = queryHelper.parsePropertiesQuery(properties, tableName);

        //assert
        expect(result).to.equal(null);
        done();
    });

    it("should return null if operator is missing", function(done){
        //arrange
        var tableName = "device",
            properties = {
                value: {
                    "name":"test"
                }
            };

        //act
        var result = queryHelper.parsePropertiesQuery(properties, tableName);

        //assert
        expect(result).to.equal(null);
        done();
    });

    it("should return null if value is not object", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "eq",
                value: []
            };

        //act
        var result = queryHelper.parsePropertiesQuery(properties, tableName);

        //assert
        expect(result).to.equal(null);
        done();
    });

    it("should return exist query with '=' for each attribute when operator is eq and value is object", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "eq",
                value: {
                    name: "dev1",
                    loc: "loc1"
                }
            };

        var expectedResult = 'EXISTS (SELECT id FROM device WHERE "key" = \'name\' AND "value" = \'dev1\' AND  "deviceId" = "d"."id") AND EXISTS (SELECT id FROM device WHERE "key" = \'loc\' AND "value" = \'loc1\' AND  "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parsePropertiesQuery(properties, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return exist query with '<>' for each attribute when operator is neq and value is object", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "neq",
                value: {
                    name: "dev1",
                    loc: "loc1"
                }
            };

        var expectedResult = 'EXISTS (SELECT id FROM device WHERE "key" = \'name\' AND "value" <> \'dev1\' AND  "deviceId" = "d"."id") AND EXISTS (SELECT id FROM device WHERE "key" = \'loc\' AND "value" <> \'loc1\' AND  "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parsePropertiesQuery(properties, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return exist query with '%like%' for each attribute when operator is like and value is object", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "like",
                value: {
                    name: "dev1",
                    loc: "loc1"
                }
            };

        var expectedResult = 'EXISTS (SELECT id FROM device WHERE "key" = \'name\' AND "value" like \'%dev1%\' AND  "deviceId" = "d"."id") AND EXISTS (SELECT id FROM device WHERE "key" = \'loc\' AND "value" like \'%loc1%\' AND  "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parsePropertiesQuery(properties, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return exist query with @> for each attribute when operator is like and value is object", function(done){
        //arrange
        var tableName = "device_attributes",
            properties = {
                operator: "in",
                value: [  {"Attr2_2": "Val2", "Attr1_1": "Val1"}]
            };

        var expectedResult = 'EXISTS (SELECT "deviceId" FROM device_attributes GROUP BY "deviceId" HAVING array_agg(key || \':\' || value) @> \'{Attr2_2:Val2,Attr1_1:Val1}\' AND "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parsePropertiesQuery(properties, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });
});

describe("query helper parseComponentsQuery", function(){
    it("should return exist query for device id when operator exists is true", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "exists",
                value: true
            };

        var expectedResult = 'EXISTS (SELECT id FROM device WHERE  "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parseComponentsQuery(properties, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return not exist query for device id when operator exists is false", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "exists",
                value: false
            };

        var expectedResult = ' NOT EXISTS (SELECT id FROM device WHERE  "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parseComponentsQuery(properties, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return null if value is empty object", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "eq",
                value: {
                }
            };

        //act
        var result = queryHelper.parseComponentsQuery(properties, tableName);

        //assert
        expect(result).to.equal(null);
        done();
    });

    it("should return null if operator is missing", function(done){
        //arrange
        var tableName = "device",
            properties = {
                value: {
                    "name": "test"
                }
            };

        //act
        var result = queryHelper.parseComponentsQuery(properties, tableName);

        //assert
        expect(result).to.equal(null);
        done();
    });

    it("should return null if value is not object", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "eq",
                value: []
            };

        //act
        var result = queryHelper.parseComponentsQuery(properties, tableName);

        //assert
        expect(result).to.equal(null);
        done();
    });

    it("should return exist query with '=' for each attribute when operator is eq and value is object", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "eq",
                value: {
                    name: "dev1",
                    loc: "loc1"
                }
            };

        var expectedResult = 'EXISTS (SELECT id FROM device WHERE "name" = \'dev1\' AND  "deviceId" = "d"."id") AND EXISTS (SELECT id FROM device WHERE "loc" = \'loc1\' AND  "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parseComponentsQuery(properties, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return exist query with '<>' for each attribute when operator is neq and value is object", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "neq",
                value: {
                    name: "dev1",
                    loc: "loc1"
                }
            };

        var expectedResult = 'EXISTS (SELECT id FROM device WHERE "name" <> \'dev1\' AND  "deviceId" = "d"."id") AND EXISTS (SELECT id FROM device WHERE "loc" <> \'loc1\' AND  "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parseComponentsQuery(properties, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return exist query with '%like%' for each attribute when operator is like and value is object", function(done){
        //arrange
        var tableName = "device",
            properties = {
                operator: "like",
                value: {
                    name: "dev1",
                    loc: "loc1"
                }
            };

        var expectedResult = 'EXISTS (SELECT id FROM device WHERE "name" like \'%dev1%\' AND  "deviceId" = "d"."id") AND EXISTS (SELECT id FROM device WHERE "loc" like \'%loc1%\' AND  "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parseComponentsQuery(properties, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });
});


describe("query helper parseTagsQuery", function(){
    var tableName = "device_tags";
    it("should return exist query for device id when operator exists is true", function(done){
        //arrange
        var
            tags = {
                operator: "exists",
                value: ["tag1","tag2"]
            };

        var expectedResult = 'EXISTS (SELECT id FROM '+tableName+' WHERE  "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parseTagsQuery(tags, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return not exist query for device id when operator exists is false", function(done){
        //arrange
        var
            tags = {
                operator: "exists",
                value: false
            };

        var expectedResult = ' NOT EXISTS (SELECT id FROM '+tableName+' WHERE  "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parseTagsQuery(tags, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return null if value is empty object", function(done){
        //arrange
        var
            tags = {
                operator: "eq",
                value: ""
            };

        //act
        var result = queryHelper.parseTagsQuery(tags, tableName);

        //assert
        expect(result).to.equal(null);
        done();
    });

    it("should return exist query with '=' for each attribute when operator is eq and value is object", function(done){
        //arrange
        var
            tags = {
                operator: "eq",
                value: ["tag2","tag1"]
            };

        var expectedResult = 'EXISTS (SELECT "deviceId" FROM '+tableName+' GROUP BY "deviceId" HAVING array_agg(value ORDER BY value) = \'{tag1,tag2}\' AND "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parseTagsQuery(tags, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return exist query with '<>' for each attribute when operator is neq and value is object", function(done){
        //arrange
        var
            tags = {
                operator: "neq",
                value: "dev1"
            };

        var expectedResult = 'EXISTS (SELECT "deviceId" FROM '+tableName+' GROUP BY "deviceId" HAVING array_agg(value ORDER BY value) <> \'{dev1}\' AND "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parseTagsQuery(tags, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return exist query with '%like%' for one attribute when operator is like and value is string", function(done){
        //arrange
        var
            tags = {
                operator: "like",
                value: "tag1"
            };

        var expectedResult = 'EXISTS (SELECT "deviceId" FROM '+tableName+' GROUP BY "deviceId" HAVING array_to_string(array_agg(value ORDER BY value),\',\') LIKE \'%tag1%\' AND "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parseTagsQuery(tags, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return exist query with '%like%' for each tag when operator is like and value is array", function(done){
        //arrange
        var
            tags = {
                operator: "like",
                value: ["tag2","tag1"]
            };

        var expectedResult = 'EXISTS (SELECT "deviceId" FROM '+tableName+' GROUP BY "deviceId" HAVING array_to_string(array_agg(value ORDER BY value),\',\') LIKE \'%tag1%tag2%\' AND "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parseTagsQuery(tags, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });

    it("should return exist query with values in array for in operator", function(done){
        //arrange
        var
            tags = {
                operator: "in",
                value:  ["dev1", "dev2"]
            };

        var expectedResult = 'EXISTS (SELECT "deviceId" FROM '+tableName+' GROUP BY "deviceId" HAVING array_agg(value ORDER BY value) @> \'{dev1,dev2}\' AND "deviceId" = "d"."id")';
        //act
        var result = queryHelper.parseTagsQuery(tags, tableName);

        //assert
        expect(result).to.equal(expectedResult);
        done();
    });



});

describe("query helper parseQuery", function() {

    it("should return query wit element not null for exists operator true", function (done) {
        //arrange
        var criteria = {
            components: {
                operator: "exists",
                value: true
            }
        };
        //act
        var result = queryHelper.parseQuery(criteria);

        //assert
        expect(result).to.equal('"components" IS NOT NULL ');
        done();
    });

    it("should return query with element is null for exists operator false", function (done) {
        //arrange
        var criteria = {
            components: {
                operator: "exists",
                value: false
            }
        };
        //act
        var result = queryHelper.parseQuery(criteria);

        //assert
        expect(result).to.equal('"components" IS NULL ');
        done();
    });

    it("should return empty object if empty criteria provided", function (done) {
        //arrange
        var criteria = {
        };
        //act
        var result = queryHelper.parseQuery(criteria);

        //assert
        expect(result).to.equal(null);
        done();
    });

    it("should return null if criteria are missing operator", function (done) {
        //arrange
        var criteria = {
            test:{}
        };
        //act
        var result = queryHelper.parseQuery(criteria);

        //assert
        expect(result).to.equal(null);
        done();
    });

    it("should return varchar query equal for status field with eq", function (done) {
        //arrange
        var criteria = {
            status:{
                operator: "eq",
                value: "active"
            }
        };
        //act
        var result = queryHelper.parseQuery(criteria);

        //assert
        expect(result).to.equal('"status"::varchar = \'active\'');
        done();
    });

    it("should return query with many fields with AND when more criteria provided", function (done) {
        //arrange
        var criteria = {
            status:{
                operator: "eq",
                value: "active"
            },
            name:{
                operator: "eq",
                value: "name"
            }
        };
        //act
        var result = queryHelper.parseQuery(criteria);

        //assert
        expect(result).to.equal('"status"::varchar = \'active\' AND "name" = \'name\'');
        done();
    });

    it("should return query all field name when criteria provided", function (done) {
        //arrange
        var criteria = {
            name:{
                operator: "all",
                value: ["name1", "name2"]
            }
        };
        //act
        var result = queryHelper.parseQuery(criteria);

        //assert
        expect(result).to.equal('"name" = \'{name1,name2}\'');
        done();
    });

});

describe("query helper parseFilters", function() {
    beforeEach(function(){
        callback = sinon.spy();
    });

    it("should callback object with limit, skip and order for provided field", function (done) {
        //arrange
        var filters = {
                limit: 10,
                skip: 1,
                sort: "name",
                order: "desc"
            },
            attributes = {
                name: {
                    fieldName:  "d_name"
                }
            };

        var expectedResult = {
            limit: 10,
            offset: 1,
            order:  [["d_name","DESC"]],
            where: {}
        };

        //act
        queryHelper.parseFilters(filters, attributes, callback);

        //assert
        assertCallbackSucceded();
        assertResultObjectInCallbackIsEqualToObject(expectedResult);
        done();
    });

    it("should callback object with limit, skip and order for provided field", function (done) {
        //arrange
        var filters = {
                limit: 10,
                skip: 1,
                sort: "name",
                order: "desc"
            },
            attributes = {
                name: {
                    fieldName:  "d_name"
                }
            };

        var expectedResult = {
            limit: 10,
            offset: 1,
            order:  [["d_name","DESC"]],
            where: {}
        };

        //act
        queryHelper.parseFilters(filters, attributes, callback);

        //assert
        assertCallbackSucceded();
        assertResultObjectInCallbackIsEqualToObject(expectedResult);
        done();
    });

    it("should callback object with limit, skip, order and where for if filter has field from attributes", function (done) {
        //arrange
        var filters = {
                limit: 10,
                skip: 1,
                sort: "name",
                order: "desc",
                name: "test"
            },
            attributes = {
                name: {
                    fieldName:  "d_name"
                }
            };

        var expectedResult = {
            limit: 10,
            offset: 1,
            order:  [["d_name","DESC"]],
            where: {d_name: "test"}
        };

        //act
        queryHelper.parseFilters(filters, attributes, callback);

        //assert
        assertCallbackSucceded();
        assertResultObjectInCallbackIsEqualToObject(expectedResult);
        done();
    });

    it("should callback object with parsed json if possible when filter has field from attributes", function (done) {
        //arrange
        var filters = {
                limit: 10,
                skip: 1,
                sort: "name",
                order: "desc",
                name: '{"check":"value"}'
            },
            attributes = {
                name: {
                    fieldName:  "d_name"
                }
            };

        var expectedResult = {
            limit: 10,
            offset: 1,
            order:  [["d_name","DESC"]],
            where: {
                d_name: {
                    check:"value"
                }
            }
        };

        //act
        queryHelper.parseFilters(filters, attributes, callback);

        //assert
        assertCallbackSucceded();
        assertResultObjectInCallbackIsEqualToObject(expectedResult);
        done();
    });
});
