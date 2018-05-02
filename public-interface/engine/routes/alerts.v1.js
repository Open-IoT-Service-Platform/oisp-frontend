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

var alerts = require ('../handlers/v1/alerts'),
    schemaValidator = require('./../../lib/schema-validator'),
    schemas = require('./../../lib/schema-validator/schemas'),
    VERSION = '/v1/api',
    PATH = '/alerts',
    FULL_PATH = '/accounts/:accountId/alerts';

module.exports = {
    register:  function (app) {
        app.get(VERSION + FULL_PATH + "/unread", alerts.getUnreadAlerts);

        app.get(VERSION + FULL_PATH, alerts.getAlerts);

        app.delete(VERSION + FULL_PATH, alerts.deleteAlerts);

        app.get(VERSION + FULL_PATH + "/:alertId", alerts.getAlert);

        app.delete(VERSION + FULL_PATH + "/:alertId", alerts.deleteAlert);

        app.post(VERSION + PATH, schemaValidator.validateSchema(schemas.alert.POST), alerts.trigger);
        app.post(VERSION + FULL_PATH, schemaValidator.validateSchema(schemas.alert.POST), alerts.trigger);

        app.put(VERSION + FULL_PATH + "/:alertId/reset", schemaValidator.validateSchema(schemas.alert.PUT), alerts.reset);

        app.put(VERSION + FULL_PATH + "/:alertId/status/:status", schemaValidator.validateSchema(schemas.alert.PUT), alerts.changeStatus);

        app.post(VERSION + FULL_PATH + "/:alertId/comments", schemaValidator.validateSchema(schemas.alert.COMMENTS), alerts.addComments);
    }
};