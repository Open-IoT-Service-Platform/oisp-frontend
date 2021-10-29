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

describe('usersApi.getUserSettings', function() {
    var usersManager;

    beforeEach(function() {
        usersManager = rewire('../../../../../../engine/api/v1/users');
        Q.longStackSupport = true;
    });

    it('should get user settings', function (done) {
        // prepare
        var userSettingsMock = {
                findByCategory: sinon.stub().callsArgWith(3, null, {})
            },
            callback = sinon.spy();
        usersManager.__set__('userSettings', userSettingsMock);

        var userId = uuid.v4();
        var accountId = uuid.v4();
        var category = 'category-' + uuid.v4();

        // execute
        usersManager.getUserSettings(userId, accountId, category, callback);

        // attest
        expect(callback.calledOnce).to.be(true);
        var callbackError = callback.getCall(0).args[0];
        expect(callbackError).not.to.be.ok();
        var callbackData = callback.getCall(0).args[1];
        expect(callbackData).to.be.ok();
        expect(userSettingsMock.findByCategory.calledOnce).to.be(true);
        expect(userSettingsMock.findByCategory.args[0].slice(0, 3)).to.eql([userId, accountId, category]);

        done();
    });

    it('should not get user settings - not found', function (done) {
        // prepare
        var error = errBuilder.build(errBuilder.Errors.User.Setting.NotFound),
            userSettingsMock = {
                findByCategory: sinon.stub().callsArgWith(3, error, null)
            },
            callback = sinon.spy();
        usersManager.__set__('userSettings', userSettingsMock);

        // execute
        usersManager.getUserSettings(1, 1, 'category', callback);

        // attest
        expect(userSettingsMock.findByCategory.calledOnce).to.be(true);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.args[0].length).to.equal(1);
        expect(callback.args[0][0].code).to.equal(error.code);
        done();
    });

    it('should get one user setting', function (done) {
        // prepare
        var userSettingsMock = {
                findById: sinon.stub().callsArgWith(4, null, {})
            },
            callback = sinon.spy();
        usersManager.__set__('userSettings', userSettingsMock);

        // execute
        usersManager.getUserSetting(1, 1, 'category', 3, callback);

        // attest
        expect(callback.calledOnce).to.be(true);
        expect(callback.args.length).to.equal(1);
        expect(callback.args[0]).not.to.be.null;
        expect(userSettingsMock.findById.calledOnce).to.be(true);

        done();
    });
});
