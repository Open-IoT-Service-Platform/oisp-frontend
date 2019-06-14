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

var {Client} = require('pg'),
    config = require('../config'),
    tracer = require('../lib/express-jaeger').tracer,
    models = require('../iot-entities/postgresql/models'),
    systemUsers = require('../lib/dp-users/systemUsers');

var CreateDB = function(){};

CreateDB.prototype.create = function(){
    const client = new Client({
        user: config.postgres.su_username,
        host: config.postgres.options.replication.write.host,
        database: 'postgres',
        password: config.postgres.su_password,
        port: config.postgres.options.replication.write.port,
    });
    const query = {text: 'CREATE DATABASE ' +
                         config.postgres.database + ';'
    };
    client.connect()
        .then(function() {
            console.log("Connected to postgres");
            return client.query(query);
        })
        .then(function() {
            query.text = 'CREATE USER ' + config.postgres.username +
                ' WITH PASSWORD ' + config.postgres.password + ';' +
                ' GRANT CONNECT ON DATABASE ' + config.postgres.database +
                ' TO ' + config.postgres.username + ';';
            return client.query();
        })
        .then(function() {
            query.text = 'CREATE DATABASE test; ' +
                'GRANT ALL PRIVILEGES ON DATABASE test TO ' +
                config.postgres.su_username + '; ' +
                'GRANT CONNECT ON DATABASE test TO ' +
                config.postgres.username + ';';
            return client.query();
        })
        .then(() => {
            return models.createDatabase();
        })
        .then(function() {
            return systemUsers.create();
        })
        .then(function() {
            models.sequelize.close();
            models.super_user_sequelize.close();
            return tracer.close();
        })
        .then(() => {
            console.log('Database created succesfully');
            return client.end();
        })
        .catch(err => {
            console.error('Can not create postgres DB');
            console.error(err);
            process.exit(1);
        });
};

module.exports = CreateDB;
