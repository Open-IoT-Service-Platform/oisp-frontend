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

var users = require ('../handlers/v1/users'),
    schemaValidator = require('../../lib/schema-validator'),
    schemas = require('../../lib/schema-validator/schemas'),
    VERSION = '/v1/api',
    PATH = '/users',
    FULL_PATH = '/accounts/:accountId/users';

module.exports = {
    register:  function (app) {
        /*
        * Describes in response headers what methods are allowed for this REST service
        * */
        app.options(VERSION + PATH, users.usage);
        app.options(VERSION + FULL_PATH, users.usage);

        /*
        * Retrieves a list of users who are access to your account.
        * You have to be an admin of an account to use this route.
        * */
        app.get(VERSION + FULL_PATH, users.getUsers);

        /*
        * Retrieves userInteraction token with id specified in URI
        * */
        app.get(VERSION + PATH + '/forgot_password', users.getPasswordToken);

        /*
        * Generates and sends by email token to reset your password
        * */
        app.post(VERSION + PATH + '/forgot_password', schemaValidator.validateSchema(schemas.user.FORGOT_PASSWORD), users.addPasswordToken);

        /*
        * Allows to change user password if you provide correct password-reset token generated in POST request
        * */
        app.put(VERSION + PATH + '/forgot_password', schemaValidator.validateSchema(schemas.user.CHANGE_PASSWORD_USING_TOKEN), users.changePassword);

        /*
        * Retrieve single setting by account, category and settingId.
        * UserId provided in URI should be always 'me'
        * Actual userId is taken from token provided in Authorization header.
        * */
        app.get(VERSION + FULL_PATH + '/:userId/settings/:category/:settingId', users.getUserSetting);
        app.get(VERSION + PATH + '/:userId/settings/:category/:settingId', users.getUserSetting);

        /*
         * Retrieve a list of settings from account and category
         * UserId provided in URI should be always 'me'
         * Actual userId is taken from token provided in Authorization header.
         * */
        app.get(VERSION + FULL_PATH + '/:userId/settings/:category', users.getUserSettings);
        app.get(VERSION + PATH + '/:userId/settings/:category', users.getUserSettings);

        /*
        * Retrieves user metadata.
        * UserId provided in URI must match id from token in Authorization header.
        * Otherwise 401 Not Authorized is returned
        * */
        app.get(VERSION + PATH + '/:userId', users.getUser);

        /*
        * Adds new setting for a category
        * */
        app.post(VERSION + FULL_PATH + '/:userId/settings/:category', schemaValidator.validateSchema(schemas.user.SETTINGS_ADD), users.addUserSettings);
        app.post(VERSION + PATH + '/:userId/settings/:category', schemaValidator.validateSchema(schemas.user.SETTINGS_ADD), users.addUserSettings);

        /*
        * Adds new user, without accounts. Created & updated times are set to current time.
        * User metadata is propagated to AA, user is created in db, then activation email is sent.
        * */
        app.post(VERSION + PATH, schemaValidator.validateSchema(schemas.user.POST), users.addUser);

        /*
         * Delete single setting by account, category and settingId.
         * UserId provided in URI should be always 'me'
         * Actual userId is taken from token provided in Authorization header.
         * */
        app.delete(VERSION + FULL_PATH + '/:userId/settings/:category/:settingId', users.deleteUserSettings);
        app.delete(VERSION + PATH + '/:userId/settings/:category/:settingId', users.deleteUserSettings);

        /*
        * Deletes user from both AA and db.
        * User can only delete herself.UserId provided in URI must match id from token in Authorization header.
        * */
        app.delete(VERSION + PATH + '/:userId', users.deleteUser);

        /*
        * Allows change of password for user when provided email, old password and new password.
        * */
        app.put(VERSION + PATH +  '/:email/change_password', schemaValidator.validateSchema(schemas.user.CHANGE_PASSWORD_USING_OLD), users.changePasswordWithCurrentPwd);

        /*
         * Updates single setting by account, category and settingId.
         * UserId provided in URI should be always 'me'
         * Actual userId is taken from token provided in Authorization header.
         * */
        app.put(VERSION + FULL_PATH + '/:userId/settings/:category/:settingId', schemaValidator.validateSchema(schemas.user.SETTINGS_UPDATE), users.updateUserSettings);
        app.put(VERSION + PATH + '/:userId/settings/:category/:settingId', schemaValidator.validateSchema(schemas.user.SETTINGS_UPDATE), users.updateUserSettings);

        /*
        * Adds or updates role of another user for single account provided in URI and body.
        * Requester must be an admin for that account.
        * Admin role cannot be reduced back to user.
        * Update time is changed to current time.
        * User metadata is propagated to AA.
        * */
        app.put(VERSION + FULL_PATH + '/:userId', schemaValidator.validateSchema(schemas.user.PUT), users.updateUserRoleForYourAccount);

        /*
        * Allows to update user attributes or accept terms and conditions of use.
        * This data can be changed only for you (user from token provided in Authorization header).
        * */
        app.put(VERSION + PATH + '/:userId', schemaValidator.validateSchema(schemas.user.PUT), users.updateUserAttributesOrTaC);

        /*
        * Activate user and removes provided userInteraction token of type activate-user from db.
        * Does not propagate this change to AA side.
        * */
        app.post(VERSION + PATH + '/activate', schemaValidator.validateSchema(schemas.user.ACTIVATE), users.activate);

        /*
         * Generates new activation token for provided user and sends it by email.
         * Previous tokens are removed and become expired.
         * */
        app.post(VERSION + PATH + '/request_user_activation', schemaValidator.validateSchema(schemas.user.REACTIVATE), users.reactivate);

    }
};
