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

"use strict";
var expect = require('expect.js'),
    sinon = require('sinon'),
    schemaValidator = require('./../../../../lib/schema-validator'),
    schemas = require('./../../../../lib/schema-validator/schemas'),
    errBuilder = require('../../../../lib/errorHandler/errorHandler').errBuilder;

var simpleObjectSchema = {
    name: 'test',
    type: 'object',
    additionalProperties: false,
    properties: {
        id: {
            type: 'integer',
            required: true
        },
        name: {
            type: 'string',
            required: true
        },
        on: {
            type: 'integer',
            required: true
        },
        verified: {
            type: 'boolean',
            required: true
        }
    }
};

var complexObjectSchema = {
    name: 'test',
    type: 'object',
    additionalProperties: false,
    properties: {
        deviceId: {
            type: 'string',
            required: true
        },
        loc: {
            type: 'array',
            required: false,
            minItems: 1,
            maxItems: 3,
            items: { type : 'number'}
        },
        components:{
            type: 'array',
            required: false,
            minItems: 1,
            items: {
                properties: {
                    cid: {
                        type: 'string',
                        required: true
                    },
                    name: {
                        type: 'string',
                        required: true
                    },
                    type: {
                        type: 'string',
                        required: true
                    }
                }
            }
        },
        attributes: {
            type: 'object',
            required: false,
            properties: {
                vendor: {
                    type: 'string',
                    required: true
                },
                platform: {
                    type: 'string',
                    required: true
                },
                os: {
                    type: 'string',
                    required: true
                }
            }
        }
    }
};

describe('schema validator', function(){
    describe('json schema validation over a simple object', function(){
        it('should return no errors when a valid simple object is validated against its schema', function(done){
            var domain = {
                id: 1234,
                name: 'test',
                on: new Date().getTime(),
                verified: true
            };

            var errors = schemaValidator.validate(domain, simpleObjectSchema);
            expect(errors.length).to.equal(0);

            done();
        });

        it('should return errors when an invalid simple object is validated against its schema', function(done){
            var domain = {
                name: 'test',
                on: new Date().getTime(),
                verified: true
            };

            var errors = schemaValidator.validate(domain, simpleObjectSchema);

            expect(errors.length).to.equal(1);
            expect(errors[0].property).to.equal(' property \'id\'');

            done();
        });
    });

    describe('json schema validation over a complex object', function(){
        it('should return no errors when a valid complex object is validated against its schema', function(done){
            var device = {
                deviceId: '1234',
                loc: [45.5434085, -122.654422, 124.3],
                attributes:{
                    vendor: 'intel',
                    platform: 'x86',
                    os: 'linux'
                }
            };

            var errors = schemaValidator.validate(device, complexObjectSchema);
            expect(errors.length).to.equal(0);

            done();
        });

        it('should return no errors when a valid complex object is validated against its schema - with an array of objects', function(done){
            var device = {
                deviceId: '1234',
                loc: [45.5434085, -122.654422, 124.3],
                attributes:{
                    vendor: 'intel',
                    platform: 'x86',
                    os: 'linux'
                },
                components:[
                    {
                        cid: 'fdsfdswrwe',
                        name: 'weqwop',
                        type: 'we43pom'
                    },
                    {
                        cid: 'fdsfdswrwe',
                        name: 'weqwop',
                        type: 'we43pom'
                    }
                ]
            };

            var errors = schemaValidator.validate(device, complexObjectSchema);
            expect(errors.length).to.equal(0);

            done();
        });

        it('should return errors when an invalid complex object is validated against its schema - loc has more than 3 items', function(done){
            var device = {
                deviceId: '1234',
                loc: [45.5434085, -122.654422, 124.3, 12],
                attributes:{
                    vendor: 'intel',
                    platform: 'x86',
                    os: 'linux'
                }
            };

            var errors = schemaValidator.validate(device, complexObjectSchema);
            expect(errors.length).to.equal(1);
            expect(errors[0].property).to.equal(' property \'loc\'');

            done();
        });

        it('should return errors when an invalid complex object is validated against its schema - with an array of invalid objects', function(done){
            var device = {
                deviceId: '1234',
                loc: [45.5434085, -122.654422, 124.3],
                attributes:{
                    vendor: 'intel',
                    platform: 'x86',
                    os: 'linux'
                },
                components:[
                    {
                        cid: 'fdsfdswrwe',
                        type: 'we43pom'
                    },
                    {
                        cid: 'fdsfdswrwe',
                        name: 'weqwop',
                        type: 'we43pom'
                    }
                ]
            };

            var errors = schemaValidator.validate(device, complexObjectSchema);
            expect(errors.length).to.equal(1);
            expect(errors[0].property).to.equal(' property \'components.[0].name\'');

            done();
        });
    });

    describe('json schema validation with a express middleware', function(){
        it('should return no error when validating a valid object', function(done){
            var device = {
                "deviceId": "23423432-23423423-234234-3242342-4a7",
                "gatewayId": "23423432-23423423-234234-3242342-4a7",
                "name": "Device #A3 update",
                "tags": ["ARG", "Jujuy"],
                "loc": [ 45.5434085, -122.654422, 124.3 ],
                "attributes": {
                    "vendor": "intel",
                    "platform": "x86",
                    "os": "linux"
                }
            };
            var req = {
                    body: device
                },
                nextSpy = sinon.spy();

            var validator = schemaValidator.validateSchema(schemas.device.POST);
            validator(req, {}, nextSpy);

            expect(nextSpy.calledOnce).to.equal(true);
            expect(nextSpy.args[0].length).to.equal(0);

            done();
        });

        it('should return error when validating a valid object', function(done){
            var device = {},
                req = {
                    body: device,
                    url: '/devices',
                    method: 'POST'
                },
                nextSpy = sinon.spy();

            var validator = schemaValidator.validateSchema(schemas.device.POST);
            validator(req, {}, nextSpy);
            expect(nextSpy.calledOnce).to.equal(true);
            expect(nextSpy.args[0].length).to.equal(1);
            expect(nextSpy.args[0][0].code).to.equal(400);

            done();
        });
    });

    describe('component json schema validation', function(){
        it('should return no errors when a valid component object is validated against its schema - POST', function(done){
            var object = {
                "dimension": "temperature1",
                "version": "2.0",
                "type": "sensor",
                "dataType":"Number",
                "format": "float",
                "min": -150,
                "max": 150,
                "measureunit": "Degress Celsius",
                "display": "timeSeries"
            };

            var errors = schemaValidator.validate(object, schemas.component.POST);
            expect(errors.length).to.equal(0);

            done();
        });

        it('should return errors when a invalid component object is validated against its schema - POST', function(done){
            var object = {
                "id":"temperature.v2",
                "dimension": "temperature/",
                "version": "v2.0",
                "type": "sensor",
                "dataType":"Custom",
                "format": "decimal",
                "min": -150,
                "max": 150,
                "measureunit": "Degress Celsius",
                "display": "timeSeries"
            };

            var errors = schemaValidator.validate(object, schemas.component.POST);
            expect(errors.length).to.equal(4);

            done();
        });

        it('should return no errors when a valid component object is validated against its schema - PUT', function(done){
            var object = {
                "type": "actuator",
                "dataType":"Boolean",
                "format": "boolean",
                "measureunit": "Degress",
                "display": "timeSeries"
            };

            var errors = schemaValidator.validate(object, schemas.component.PUT);
            expect(errors.length).to.equal(0);

            done();
        });

        it('should return errors when a invalid component object is validated against its schema - PUT', function(done){
            var object = {
                "id":"temperature.v3",
                "type": "actuator",
                "dataType":"Number",
                "format": "float",
                "measureunit": "Degress",
                "display": "timeSeries"
            };

            var errors = schemaValidator.validate(object, schemas.component.PUT);
            expect(errors.length).to.equal(1);

            done();
        });
    });

    describe('validate dynamic schema', function() {
        function postSchemaSelector(req) {
            if(req.body && req.body.type === "actuator") {
                return schemas.component.POST_ACTUATOR;
            } else {
                return schemas.component.POST;
            }
        };
        it('should return error when validating an invalid object', function(done){
            var device = {},
                req = {
                    body: device,
                    url: '/devices',
                    method: 'POST'
                },
                nextSpy = sinon.spy();

            var validator = schemaValidator.validateDynamicSchema(postSchemaSelector);
            validator(req, {}, nextSpy);
            expect(nextSpy.calledOnce).to.equal(true);
            expect(nextSpy.args[0].length).to.equal(1);
            expect(nextSpy.args[0][0].code).to.equal(errBuilder.Errors.Generic.InvalidRequest.code);

            done();
        });

        it('should return no error when validating an valid object', function(done){
            var object = {
                "dimension": "temperature1",
                "version": "2.0",
                "type": "sensor",
                "dataType":"Number",
                "format": "float",
                "min": -150,
                "max": 150,
                "measureunit": "Degress Celsius",
                "display": "timeSeries"
            };
            var req = {
                    body: object
                },
                nextSpy = sinon.spy();

            var validator = schemaValidator.validateDynamicSchema(postSchemaSelector);
            validator(req, {}, nextSpy);

            expect(nextSpy.calledOnce).to.equal(true);
            expect(nextSpy.args[0].length).to.equal(0);

            done();
        });
    });
});
