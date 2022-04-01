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
    logger = rewire('./../../../../lib/logger/logger'),
    loggerModuleMock,
    formatterMock,
    configMock;

describe('logger', function(){
    beforeEach(function(){
        // prepare

        loggerModuleMock = {
            transports: {
                console: {},
                file: {}
            },
            debug: sinon.spy(),
            info: sinon.spy(),
            warn: sinon.spy(),
            error: sinon.spy(),
            critical: sinon.spy()
        };

        configMock = {
            logger: {
                transport: {
                    console: {
                    },
                    file: {
                    }
                },
                level: "info"
            }
        };

        formatterMock = {
            format: sinon.spy()
        };
    });

    beforeEach(function () {
        logger.__set__('winstonLogger', loggerModuleMock);
        logger.__set__('loggerConf', configMock.logger);
    });

    it('should not log in debug mode', function(done){
        // execute
        var loggerInstance = new logger(formatterMock);
        loggerInstance.debug('test');

        // attest
        expect(loggerModuleMock.debug.calledOnce).to.equal(false);
        expect(formatterMock.format.calledOnce).to.equal(false);

        done();
    });

    it('should not log in debug mode when using force log level option', function(done){
        // execute
        var loggerInstance = new logger(formatterMock);
        loggerInstance.debug('test', { forceLogLevel: 'TEST' });

        // attest
        expect(loggerModuleMock.debug.calledOnce).to.equal(false);
        expect(formatterMock.format.calledOnce).to.equal(false);

        done();
    });

    it('should log in info mode', function(done){
        // execute
        var loggerInstance = new logger(formatterMock);
        loggerInstance.info('test');

        // attest
        expect(loggerModuleMock.info.calledOnce).to.equal(true);
        expect(formatterMock.format.calledOnce).to.equal(true);

        done();
    });

    it('should not log in info mode when using force log level option', function(done){
        // execute
        var loggerInstance = new logger(formatterMock);
        loggerInstance.info('test', { forceLogLevel: 'TEST' });

        // attest
        expect(loggerModuleMock.info.calledOnce).to.equal(false);
        expect(formatterMock.format.calledOnce).to.equal(false);

        done();
    });

    it('should log in log mode', function(done){
        // execute
        var loggerInstance = new logger(formatterMock);
        loggerInstance.log('test');

        // attest
        expect(loggerModuleMock.info.calledOnce).to.equal(true);
        expect(formatterMock.format.calledOnce).to.equal(true);

        done();
    });

    it('should not log in log mode when using force log level option', function(done){
        // execute
        var loggerInstance = new logger(formatterMock);
        loggerInstance.log('test', { forceLogLevel: 'TEST' });

        // attest
        expect(loggerModuleMock.info.calledOnce).to.equal(false);
        expect(formatterMock.format.calledOnce).to.equal(false);

        done();
    });

    it('should log in warn mode', function(done){
        // execute
        var loggerInstance = new logger(formatterMock);
        loggerInstance.warn('test');

        // attest
        expect(loggerModuleMock.warn.calledOnce).to.equal(true);
        expect(formatterMock.format.calledOnce).to.equal(true);

        done();
    });

    it('should not log in warn mode when using force log level option', function(done){
        // execute
        var loggerInstance = new logger(formatterMock);
        loggerInstance.warn('test', { forceLogLevel: 'TEST' });

        // attest
        expect(loggerModuleMock.warn.calledOnce).to.equal(false);
        expect(formatterMock.format.calledOnce).to.equal(false);

        done();
    });

    it('should log in error mode', function(done){
        // execute
        var loggerInstance = new logger(formatterMock);
        loggerInstance.error('test');

        // attest
        expect(loggerModuleMock.error.calledOnce).to.equal(true);
        expect(formatterMock.format.calledOnce).to.equal(true);

        done();
    });

    it('should not log in error mode when using force log level option', function(done){
        // execute
        var loggerInstance = new logger(formatterMock);
        loggerInstance.error('test', { forceLogLevel: 'TEST' });

        // attest
        expect(loggerModuleMock.error.calledOnce).to.equal(false);
        expect(formatterMock.format.calledOnce).to.equal(false);

        done();
    });

    it('should log in critical mode', function(done){
        // execute
        var loggerInstance = new logger(formatterMock);
        loggerInstance.critical('test');

        // attest
        expect(loggerModuleMock.critical.calledOnce).to.equal(true);
        expect(formatterMock.format.calledOnce).to.equal(true);

        done();
    });

    it('should not log in critical mode when using force log level option', function(done){
        // execute
        var loggerInstance = new logger(formatterMock);
        loggerInstance.critical('test', { forceLogLevel: 'TEST' });

        // attest
        expect(loggerModuleMock.critical.calledOnce).to.equal(false);
        expect(formatterMock.format.calledOnce).to.equal(false);

        done();
    });
});
