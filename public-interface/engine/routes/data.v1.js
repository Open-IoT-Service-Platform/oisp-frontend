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

var data = require ('../handlers/v1/data'),
    schemaValidator = require('../../lib/schema-validator'),
    schemas = require('../../lib/schema-validator/schemas'),
    VERSION = '/v1/api',
    PATH = '/data',
    FULL_PATH = '/accounts/:accountId/data';

module.exports = {
    register:  function (app) {
        app.options(VERSION + PATH, data.usage);
        app.options(VERSION + FULL_PATH, data.usage);

        app.post(VERSION + FULL_PATH + '/search', schemaValidator.validateSchema(schemas.data.SEARCH), data.searchData);

        app.post(VERSION + FULL_PATH + '/search/advanced', schemaValidator.validateSchema(schemas.data.SEARCH_ADVANCED), data.searchDataAdvanced);

        app.post(VERSION + FULL_PATH + '/report', schemaValidator.validateSchema(schemas.data.REPORT), data.aggregatedReport);

        app.post(VERSION + FULL_PATH + '/firstLastMeasurementTimestamp', schemaValidator.validateSchema(schemas.data.FIRST_LAST_MEASUREMENT), data.firstLastMeasurement);

        app.post(VERSION + PATH + "/admin/:deviceId", schemaValidator.validateSchema(schemas.data.POST), data.collectDataAdmin);

        app.post(VERSION + PATH + "/:deviceId", schemaValidator.validateSchema(schemas.data.POST), data.collectData);

        app.get(VERSION + FULL_PATH + "/totals", data.getTotals);
    }
};
