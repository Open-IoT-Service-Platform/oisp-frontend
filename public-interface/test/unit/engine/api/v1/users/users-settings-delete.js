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

describe('usersApi.deleteUserSettings', function () {

    var usersManager,
        userId,
        accountId,
        category,
        settingId,
        callback;

    beforeEach(function () {
        usersManager = rewire('../../../../../../engine/api/v1/users');
        Q.longStackSupport = true;
        userId = uuid.v4();
        accountId = uuid.v4();
        category = 'default';
        settingId = uuid.v4();
        callback = sinon.spy();
    });

    it('should not delete user setting if not found', function (done) {
        // prepare
        var error = errBuilder.build(errBuilder.Errors.User.Setting.NotFound),
            userSettingsMock = {
                delete: sinon.stub().callsArgWith(1, error, null)
            };

        usersManager.__set__('userSettings', userSettingsMock);

        // execute
        usersManager.deleteUserSettings(userId, accountId, category, settingId, callback);

        // attest
        expect(userSettingsMock.delete.calledOnce).to.equal(true);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.getCall(0).args[0].code).to.equal(error.code);

        done();
    });

    it('should delete user setting if everything is ok', function (done) {
        // prepare
        var userSettingsMock = {
            delete: sinon.stub().callsArgWith(1, null, null)
        };

        usersManager.__set__('userSettings', userSettingsMock);

        // execute
        usersManager.deleteUserSettings(userId, accountId, category, settingId, callback);

        // attest
        expect(userSettingsMock.delete.calledOnce).to.equal(true);
        expect(callback.calledOnce).to.equal(true);
        expect(callback.getCall(0).args[0]).to.equal(null);

        done();
    });
});
