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

describe('usersApi.updateUserSettings', function () {
    var usersManager,
        userId,
        accountId,
        category,
        settingId,
        allSettings,
        currentSetting,
        setting,
        callback,
        userSettingsMock,
        updateSettingsErrorCode = 2504;

    beforeEach(function () {
        usersManager = rewire('../../../../../../engine/api/v1/users');
        Q.longStackSupport = true;
        userId = uuid.v4();
        accountId = uuid.v4();
        category = 'default';
        settingId = uuid.v4();
        callback = sinon.spy();

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

        currentSetting = {
            userId: userId,
            domainId: accountId,
            category: category
        };

        setting = {
            default: true
        };

        userSettingsMock = {
            findById: sinon.stub().callsArgWith(4, null, currentSetting),
            findByCategory: sinon.stub().yields(null, allSettings),
            update: sinon.stub().callsArgWith(2, null, setting),
            new: sinon.stub().yields(null, { default: false })
        };

        usersManager.__set__('userSettings', userSettingsMock);
    });

    it('should update default user setting if no errors occur and data is valid', function (done) {
        // prepare
        // execute
        usersManager.updateUserSettings(userId, accountId, category, settingId, setting, callback)
            .done(function () {
                // attest
                expect(userSettingsMock.findById.calledOnce).to.equal(true);
                expect(userSettingsMock.update.calledOnce).to.equal(true);
                expect(callback.calledOnce).to.equal(true);

                done();
            });
    });

    it('should not update user setting if user settings find returned unexpected error', function (done) {
        // prepare
        var error = "Some unexpected DB error";
        userSettingsMock.findById = sinon.stub().yields(error);

        // execute
        usersManager.updateUserSettings(userId, accountId, category, settingId, {}, callback)
            .done(function () {
                // attest
                expect(userSettingsMock.findById.calledOnce).to.equal(true);
                expect(userSettingsMock.update.calledOnce).to.equal(false);
                expect(callback.calledOnce).to.equal(true);
                expect(callback.getCall(0).args[0].code).to.equal(updateSettingsErrorCode);

                done();
            });
    });

    it('should not update user setting if setting not found', function (done) {
        var error = errBuilder.build(errBuilder.Errors.User.Setting.NotFound);
        userSettingsMock.findById = sinon.stub().yields(error);

        // execute
        usersManager.updateUserSettings(userId, accountId, category, settingId, {}, callback)
            .done(function () {
                // attest
                expect(userSettingsMock.findById.calledOnce).to.equal(true);
                expect(userSettingsMock.update.calledOnce).to.equal(false);
                expect(callback.calledOnce).to.equal(true);
                expect(callback.getCall(0).args[0].code).to.equal(updateSettingsErrorCode);

                done();
            });
    });

    it('should not update user setting if database error is encountered', function (done) {
        // prepare
        var error = errBuilder.Errors.Generic.InternalServerError;
        userSettingsMock.update = sinon.stub().callsArgWith(2, error);

        // execute
        usersManager.updateUserSettings(userId, accountId, category, settingId, {}, callback)
            .done(function () {
                // attest
                expect(userSettingsMock.findById.calledOnce).to.equal(true);
                expect(userSettingsMock.update.calledOnce).to.equal(true);
                expect(callback.calledOnce).to.equal(true);
                expect(callback.getCall(0).args[0].code).to.equal(updateSettingsErrorCode);

                done();
            });
    });


    it('should update not default user setting if database error is not encountered', function (done) {
        // prepare
        setting.default = false;

        // execute
        usersManager.updateUserSettings(userId, accountId, category, settingId, setting, callback)
            .done(function () {
                // attest
                expect(userSettingsMock.findById.calledOnce).to.equal(true);
                expect(userSettingsMock.update.calledOnce).to.equal(true);
                expect(callback.calledOnce).to.equal(true);

                done();
            });
    });

    it('should not update default user setting with favorite category if database error is encountered', function (done) {
        // prepare
        var error = errBuilder.Errors.Generic.InternalServerError;

        category = 'favorite';
        userSettingsMock.update = sinon.stub().callsArgWith(2, error);

        // execute
        usersManager.updateUserSettings(userId, accountId, category, settingId, setting, callback)
            .done(function () {
                // attest
                expect(userSettingsMock.findById.calledOnce).to.equal(true);
                expect(userSettingsMock.update.calledTwice).to.equal(true);
                expect(callback.calledOnce).to.equal(true);

                done();
            });
    });
});
