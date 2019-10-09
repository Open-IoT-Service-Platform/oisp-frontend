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

var devices = require ('../handlers/v1/devices'),
    schemaValidator = require('../../lib/schema-validator'),
    schemas = require('../../lib/schema-validator/schemas'),
    VERSION = '/v1/api',
    PATH = '/devices',
    FULL_PATH = '/accounts/:accountId/devices';


module.exports = {
    register:  function (app) {
        app.options(VERSION + PATH, devices.usage);
        app.options(VERSION + FULL_PATH, devices.usage);

        app.get(VERSION + PATH, devices.getDevices);
        app.get(VERSION + FULL_PATH, devices.getDevices);

        app.post(VERSION + FULL_PATH + '/search', schemaValidator.validateSchema(schemas.device.SEARCH), devices.searchDevices);
        app.post(VERSION + FULL_PATH + '/count', schemaValidator.validateSchema(schemas.device.SEARCH), devices.countDevices);

        app.get(VERSION + FULL_PATH + '/tags', devices.getTags);
        app.get(VERSION + FULL_PATH + '/attributes', devices.getAttributes);
        app.get(VERSION + FULL_PATH + '/components', devices.getComponents);

        app.post(VERSION + FULL_PATH + '/components', schemaValidator.validateSchema(schemas.device.COMPONENTS_SEARCH), devices.getComponentsByCustomFilter);

        app.get(VERSION + FULL_PATH + '/totals', devices.getDeviceTotals);

        app.get(VERSION + PATH + '/:deviceId', devices.getDevice);
        app.get(VERSION + FULL_PATH + '/:deviceId', devices.getDevice);

        app.post(VERSION + PATH, schemaValidator.validateSchema(schemas.device.POST), devices.addDevice);
        app.post(VERSION + FULL_PATH, schemaValidator.validateSchema(schemas.device.POST), devices.addDevice);

        app.put(VERSION + PATH + '/:deviceId', schemaValidator.validateSchema(schemas.device.PUT), devices.updateDevice);
        app.put(VERSION + FULL_PATH + '/:deviceId', schemaValidator.validateSchema(schemas.device.PUT), devices.updateDevice);

        app.delete(VERSION + PATH + '/:deviceId/components/:componentId', schemaValidator.validateSchema(schemas.device.DELETE), devices.deleteComponent);
        app.delete(VERSION + FULL_PATH + '/:deviceId/components/:componentId', schemaValidator.validateSchema(schemas.device.DELETE), devices.deleteComponent);

        app.delete(VERSION + FULL_PATH + '/:deviceId', schemaValidator.validateSchema(schemas.device.DELETE), devices.deleteDevice);

        app.post(VERSION + PATH + '/:deviceId/components', devices.addComponents);
        app.post(VERSION + FULL_PATH + '/:deviceId/components', devices.addComponents);

        app.put(VERSION + PATH + '/:deviceId/activation', schemaValidator.validateSchema(schemas.device.ACTIVATION), devices.activateNewDevice);
        app.put(VERSION + FULL_PATH + '/:deviceId/activation', schemaValidator.validateSchema(schemas.device.ACTIVATION), devices.activateNewDevice);

        app.post(VERSION + PATH + '/register', schemaValidator.validateSchema(schemas.device.REGISTER), devices.registerDevice);
        app.post(VERSION + FULL_PATH + '/register', schemaValidator.validateSchema(schemas.device.REGISTER), devices.registerDevice);
    }
};
