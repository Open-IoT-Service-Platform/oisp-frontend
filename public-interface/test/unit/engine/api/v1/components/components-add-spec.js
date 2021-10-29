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
    Q = require('q'),
    errBuilder = require("../../../../../../lib/errorHandler/index").errBuilder,
    compManager = rewire('../../../../../../engine/api/v1/components'),
    uuid = require('uuid');

describe('componentsApi.addComponent', function(){

    var accountId,
        baseUrl,
        callback,
        options,
        component,
        actuator,
        componentMock;

    beforeEach( function () {
        accountId = uuid.v4();
        baseUrl = 'http://localhost/v1/api/cmpcatalog';
        callback = sinon.spy();
        component = {
            dimension: 'temperature',
            version: '1.0'
        };
        actuator = {
            dimension: 'actuator',
            version: '1.0',
            type: 'actuator',
            command: {
                "display": "option",
                "commandString": "ledcontrol",
                "parameters": [{
                    "name": "led1",
                    "values": "on,off"
                },{
                    "name": "led2",
                    "values": "1,2,3"
                },{
                    "name": "led3",
                    "values": "1-3"
                },{
                    "name": "led4",
                    "values": "text"
                },{
                    "name": "led5",
                    "values": "A-C"
                }]
            }
        };
        options = {component: component, baseUrl: baseUrl, domainId: accountId};

        componentMock = {
            new: sinon.stub().returns(Q.resolve(component))
        };

        compManager.__set__('Component', componentMock);

    });

    it('should add a component if it does not exist', function(done){
        // prepare

        // execute
        compManager.addComponent(options, callback)
            .then(function(){
                // attest
                expect(callback.calledOnce).to.equal(true);
                expect(callback.calledWith(null)).to.equal(true);
                expect(componentMock.new.called).to.be.equal(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0][1].href).to.equal(baseUrl + '/' + component.id);
                done();
            }).catch(function(err){
                done(err);
            });
    });

    it('should add a component of type actuator if it does not exist', function(done){
        // prepare
        componentMock.new = sinon.stub().returns(Q.resolve(actuator));
        options.component = actuator;

        // execute
        compManager.addComponent(options, callback)
            .then(function(){
                // attest
                expect(callback.calledOnce).to.equal(true);
                expect(callback.calledWith(null)).to.equal(true);
                expect(componentMock.new.called).to.be.equal(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0][1].href).to.equal(baseUrl + '/' + actuator.id);
                expect(callback.args[0][1].command.parameters[0].display).to.equal("switcher");
                expect(callback.args[0][1].command.parameters[1].display).to.equal("list");
                expect(callback.args[0][1].command.parameters[2].display).to.equal("slider");
                expect(callback.args[0][1].command.parameters[3].display).to.equal("text");
                expect(callback.args[0][1].command.parameters[4].display).to.equal("text");
                done();
            }).catch(function(err){
                done(err);
            });
    });

    it('should call callback with a 5409 error if component already exists', function(done){
        // prepare
        componentMock.new = sinon.stub().throws(errBuilder.Errors.Component.AlreadyExists);

        // execute
        compManager.addComponent(options, callback)
            .then(function(){
                // attest
                expect(callback.calledOnce).to.be.equal(true);
                expect(callback.args[0][0].code).to.be.equal(5409);
                done();
            }).catch(function(err){
                done(err);
            });
    });

    it('should call callback with a 5400 error if something weird happens', function(done){
        // prepare
        componentMock.new = sinon.stub().throws(new Error());

        // execute
        compManager.addComponent(options, callback)
            .then(function(){
                // attest
                expect(callback.calledOnce).to.equal(true);
                expect(callback.args[0][0].code).to.equal(5400);
                done();
            }).catch(function(err){
                done(err);
            });
    });

    it('should call callback with a 5411 error if actuator command parameters name are not valid', function(done){
        // prepare
        actuator.command.parameters = [{
            "name": "",
            "values": "on,off"
        },{
            "name": "led13",
            "values": "1,2,3"
        }];
        options.component = actuator;

        // execute
        compManager.addComponent(options, callback)
            .then(function(){
                // attest
                expect(callback.calledOnce).to.be.equal(true);
                expect(callback.args[0][0].code).to.be.equal(5411);
                done();
            }).catch(function(err){
                done(err);
            });
    });

    it('should call callback with a 5412 error if actuator command parameters values are not valid', function(done){
        // prepare
        actuator.command.parameters = [{
            "name": "led",
            "values": ""
        },{
            "name": "led13",
            "values": "1,2,3"
        }];
        options.component = actuator;

        // execute
        compManager.addComponent(options, callback)
            .then(function(){
                // attest
                expect(callback.calledOnce).to.be.equal(true);
                expect(callback.args[0][0].code).to.be.equal(5412);
                done();
            })
            .catch(function(err){
                done(err);
            });
    });
});
