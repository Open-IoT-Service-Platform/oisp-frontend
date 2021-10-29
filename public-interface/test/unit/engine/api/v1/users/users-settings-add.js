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
    errBuilder = require('../../../../../../lib/errorHandler/index').errBuilder;

describe('usersApi.addUserSettings', function () {

    var usersManager,
        userId,
        accountId,
        category,
        setting,
        allSettings,
        callback,
        userSettingsMock;

    beforeEach(function () {
        usersManager = rewire('../../../../../../engine/api/v1/users');
        Q.longStackSupport = true;
        userId = uuid.v4();
        accountId = uuid.v4();
        category = 'favorite';
        setting = {
            "default": true
        };
        allSettings = [
            {
                "default": true,
                id: "1"
            },
            {
                "default": false,
                id: "2"
            }
        ];
        callback = sinon.spy();

        userSettingsMock = {
            findByCategory: sinon.stub().yields(null, allSettings),
            update: sinon.stub().yields(null),
            new: sinon.stub().yields(null, { default: false })
        };

        usersManager.__set__('userSettings', userSettingsMock);
    });

    it('should create a favorite user setting', function (done) {
        // execute
        usersManager.addUserSettings(userId, accountId, category, setting, callback)
            .done(function () {
                // attest
                expect(userSettingsMock.findByCategory.calledOnce).to.equal(true);
                expect(userSettingsMock.new.calledOnce).to.equal(true);
                expect(userSettingsMock.update.calledTwice).to.equal(true);
                expect(callback.calledOnce).to.be(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0]).not.to.be.null;
                done();
            });
    });

    it('should not create a favorite user setting due to error in database', function (done) {
        // prepare
        var error = errBuilder.Errors.Generic.InternalServerError.code,
            callback = sinon.spy();

        userSettingsMock.update = sinon.stub().yields(error);

        usersManager.__set__('userSettings', userSettingsMock);

        // execute
        usersManager.addUserSettings(userId, accountId, category, setting, callback)
            .done(function () {
                // attest
                expect(userSettingsMock.findByCategory.calledOnce).to.equal(true);
                expect(userSettingsMock.update.calledTwice).to.equal(true);
                expect(callback.calledOnce).to.be(true);
                expect(userSettingsMock.new.args.length).to.equal(0);

                done();
            });
    });

    it('should not create a user setting due to database error in updateDefault', function (done) {
        // prepare
        var error = errBuilder.Errors.Generic.InternalServerError.code;

        userSettingsMock.update = sinon.stub().yields(error);

        usersManager.__set__('userSettings', userSettingsMock);

        // execute
        usersManager.addUserSettings(userId, accountId, category, setting, callback)
            .done(function () {
                // attest
                expect(callback.calledOnce).to.be(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0]).not.to.be.null;
                expect(userSettingsMock.new.args.length).to.equal(0);
                expect(userSettingsMock.update.args.length).to.equal(2);

                done();
            });
    });

    it('should not create a user setting due to database error in new method', function (done) {
        // prepare
        var error = errBuilder.Errors.Generic.InternalServerError.code;

        userSettingsMock.new = sinon.stub().yields(error, null);

        usersManager.__set__('userSettings', userSettingsMock);

        // execute
        usersManager.addUserSettings(userId, accountId, category, setting, callback)
            .done(function () {
                // attest
                expect(callback.calledOnce).to.be(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0]).not.to.be.null;
                expect(userSettingsMock.new.calledOnce).to.be(true);

                done();
            });
    });

    it('should create a favorite and not default user setting', function (done) {
        // prepare
        setting.default = false;

        usersManager.__set__('userSettings', userSettingsMock);

        // execute
        usersManager.addUserSettings(userId, accountId, category, setting, callback)
            .done(function () {

                // attest
                expect(userSettingsMock.new.calledOnce).to.be(true);
                expect(callback.calledOnce).to.be(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0]).not.to.be.null;

                done();
            });
    });

    it('should create a not default user setting', function (done) {
        // prepare
        // execute
        usersManager.addUserSettings(userId, accountId, 'not_favorite', {}, callback)
            .done(function () {

                // attest
                expect(userSettingsMock.new.calledOnce).to.be(true);
                expect(callback.calledOnce).to.be(true);
                expect(callback.args.length).to.equal(1);
                expect(callback.args[0]).not.to.be.null;

                done();
            });
    });
});
