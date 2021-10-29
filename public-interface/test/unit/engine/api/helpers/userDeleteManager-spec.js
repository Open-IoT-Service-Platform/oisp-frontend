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


var expect = require('expect.js'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    userDeleteManager = rewire('../../../../../engine/api/helpers/userDeleteManager'),
    uuid = require('uuid');


describe("User delete manager", function () {

    var firstAdminUserStub,
        secondAdminUserStub,
        firstUserStub,
        usersApiMock,
        usersListOneAdminStub,
        usersListTwoAdminsStub,
        usersListOneAdminOneUserStub;

    function prepareStubs () {
        var accountId1 = uuid.v4();
        var accountId2 = uuid.v4();

        firstAdminUserStub = {
            id: uuid.v4(),
            accounts: {
            }
        };

        firstAdminUserStub.accounts[accountId1] = 'admin';
        firstAdminUserStub.accounts[accountId2] = 'admin';

        secondAdminUserStub = {
            id: uuid.v4(),
            accounts: {
            }
        };

        secondAdminUserStub.accounts[accountId1] = 'admin';
        secondAdminUserStub.accounts[accountId2] = 'admin';

        firstUserStub = {
            id: uuid.v4(),
            accounts: {
            }
        };

        firstUserStub.accounts[accountId1] = 'user';
        firstUserStub.accounts[accountId2] = 'user';

        usersListOneAdminStub = [
            firstAdminUserStub
        ];

        usersListTwoAdminsStub = [
            firstAdminUserStub,
            secondAdminUserStub
        ];

        usersListOneAdminOneUserStub = [
            firstAdminUserStub,
            firstUserStub
        ]
    };

    function prepareMocks() {
        usersApiMock = {

        }
    }

    beforeEach (function () {
        prepareStubs();
        prepareMocks();
    });

    it('Should allow removal, for user who has no accounts', function (done) {

        var resolved = sinon.spy();
        var rejected = sinon.spy();
        var userStatus;

        //user without accounts
        firstAdminUserStub.accounts = {};

        userDeleteManager.isUserRemovable(firstAdminUserStub)
            .then(function removable(status) {
                resolved();
                userStatus = status;
            }, function notRemovable () {
                rejected();
            })
            .finally (function () {
                expect(resolved.calledOnce).to.be.equal(true);
                expect(rejected.notCalled).to.be.equal(true);
                expect(userStatus.isRemovable).to.be.equal(true);
                expect(userStatus.removableAccounts.length).to.be.equal(0);
                done();
            });
    });

    it('Should allow removal, for user who is the only user of his accounts', function (done) {

        var resolved = sinon.spy();
        var rejected = sinon.spy();
        var userStatus;

        usersApiMock.isUserSoleAdminForAccount = sinon.stub().yields(null, true);
        usersApiMock.getUsers = sinon.stub().yields(null, usersListOneAdminStub);
        userDeleteManager.__set__('users', usersApiMock);

        userDeleteManager.isUserRemovable(firstAdminUserStub)
            .then(function removable(status) {
                resolved();
                userStatus = status;
            }, function notRemovable () {
                rejected();
            })
            .finally (function () {
                expect(resolved.calledOnce).to.be.equal(true);
                expect(rejected.notCalled).to.be.equal(true);
                expect(userStatus.isRemovable).to.be.equal(true);
                expect(userStatus.removableAccounts.length).to.be.equal(Object.keys(firstAdminUserStub.accounts).length);
                done();
            });
    });

    it('Should allow removal, for user who shared admin role with other user', function (done) {

        var resolved = sinon.spy();
        var rejected = sinon.spy();
        var userStatus;

        usersApiMock.isUserSoleAdminForAccount = sinon.stub().yields(null, false);
        usersApiMock.getUsers = sinon.stub().yields(null, usersListTwoAdminsStub);
        userDeleteManager.__set__('users', usersApiMock);

        userDeleteManager.isUserRemovable(firstAdminUserStub)
            .then(function removable(status) {
                resolved();
                userStatus = status;
            }, function notRemovable () {
                rejected();
            })
            .finally (function () {
                expect(resolved.calledOnce).to.be.equal(true);
                expect(rejected.notCalled).to.be.equal(true);
                expect(userStatus.isRemovable).to.be.equal(true);
                expect(userStatus.removableAccounts.length).to.be.equal(0);
                done();
            });
    });

    it('Should not allow removal, for user who share accounts with regular user', function (done) {

        var resolved = sinon.spy();
        var rejected = sinon.spy();
        var userStatus;

        usersApiMock.isUserSoleAdminForAccount = sinon.stub().yields(null, true);

        usersApiMock.getUsers = sinon.stub().yields(null, usersListOneAdminOneUserStub);
        userDeleteManager.__set__('users', usersApiMock);

        userDeleteManager.isUserRemovable(firstAdminUserStub)
            .then(function removable(status) {
                resolved();
                userStatus = status;
            }, function notRemovable () {
                rejected();
            })
            .finally (function () {
                expect(resolved.calledOnce).to.be.equal(true);
                expect(rejected.notCalled).to.be.equal(true);
                expect(userStatus.isRemovable).to.be.equal(false);
                expect(userStatus.removableAccounts).to.be.equal(undefined);
                done();
            });
    });


});
