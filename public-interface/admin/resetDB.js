/**
 * Copyright (c) 2017 Intel Corporation
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

var models = require('../iot-entities/postgresql/models'),
	systemUsers = require('../lib/dp-users/systemUsers');

var ResetDB = function(){};

ResetDB.prototype.reset = function(cb){
    models.sequelize.authenticate()
	.then(function() {
            var tables = [];
	    var fn = function(model){
		const tableData = models.sequelize.models[model].getTableName();
		const tableName = '"' + tableData.schema + '"."' + tableData.tableName + '"';
		return models.sequelize.query('TRUNCATE TABLE ' + tableName + ' CASCADE');
	    }
            requests = Object.keys(models.sequelize.models)
		.map(fn);
            return Promise.all(requests);
	})
	.then(() => {
	    return models.initSchema();
	})
	.then(function() {
            return systemUsers.create();
	});
}

module.exports = ResetDB;
