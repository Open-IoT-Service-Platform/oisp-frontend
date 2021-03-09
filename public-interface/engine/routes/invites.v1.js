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

var invites = require ('../handlers/v1/invites'),
    schemaValidator = require('../../lib/schema-validator'),
    schemas = require('../../lib/schema-validator/schemas'),
    VERSION = '/v1/api',
    PATH = '/invites',
    FULL_PATH = '/accounts/:accountId/invites';

module.exports = {
    register:  function (app) {
        app.options(VERSION + FULL_PATH, invites.usage);
        app.get(VERSION + FULL_PATH, invites.getInvites);
        app.post(VERSION + FULL_PATH, schemaValidator.validateSchema(schemas.invite.POST), invites.addInvite);
        app.get(VERSION + PATH + '/:email', invites.getUserInvites);
        app.put(VERSION + PATH + '/:inviteId/status', schemaValidator.validateSchema(schemas.invite.PUT), invites.updateInviteStatus);
        app.delete(VERSION + FULL_PATH + '/:email', schemaValidator.validateSchema(schemas.invite.DELETE), invites.deleteUser);
        app.delete(VERSION + FULL_PATH + '/me', schemaValidator.validateSchema(schemas.invite.DELETE), invites.deleteUser);
    }
};
