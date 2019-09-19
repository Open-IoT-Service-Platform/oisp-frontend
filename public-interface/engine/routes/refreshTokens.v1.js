/**
 * Copyright (c) 2019 Intel Corporation
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

var refreshTokens = require ('../handlers/v1/refreshTokens'),
    schemaValidator = require('../../lib/schema-validator'),
    schemas = require('../../lib/schema-validator/schemas'),
    VERSION = '/v1/api',
    PATH = '/auth';

module.exports = {
    register:  function (app) {
        app.post(VERSION + PATH + '/refresh' , schemaValidator.validateSchema(schemas.refreshToken.CREATE), refreshTokens.create);
        app.put(VERSION + PATH + '/refresh' , schemaValidator.validateSchema(schemas.refreshToken.REFRESH), refreshTokens.refresh);
        app.delete(VERSION + PATH + '/refresh/revoke' , schemaValidator.validateSchema(schemas.refreshToken.REVOKE), refreshTokens.revoke);
    }
};
