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
    models = require('../iot-entities/postgresql/models');
var CreateDB = function(){};

CreateDB.prototype.create = function(){
    const client = new Client({
        user: config.postgres.su_username,
        host: config.postgres.options.replication.write.host,
        database: 'postgres',
        password: config.postgres.su_password,
        port: config.postgres.options.port,
        ssl: config.postgres.options.dialectOptions.ssl
    });
    const query = {text: 'CREATE DATABASE ' +
                         config.postgres.database + ';'
    };
    client.connect(
    )
        .then(() => console.log("Connected"))
        .catch(function(err) {
            console.log("Cannot connect: " + err);
            process.exit(1);
        })
        .then(function() {
            console.log("Executing query: ", query.text);
            return client.query(query);
        })
        .then(function() {
            query.text = 'CREATE USER ' + config.postgres.username +
                ' WITH PASSWORD \'' + config.postgres.password + '\';';
            console.log("Trying to create PG user. Executing query: ", query.text);
            return client.query(query);
        })
        .catch(function(err) {
            console.log("Cannot create user: " + err);
            console.log("OK to continue ");
        })
        .then(function() {
            query.text = ' GRANT CONNECT ON DATABASE ' + config.postgres.database +
                ' TO ' + config.postgres.username + ';';
            console.log("Trying grant rights to PG user. Executing query: ", query.text);
            return client.query(query);
        })
        .catch(function(err) {
            console.log("Cannot create user: " + err);
            console.log("OK to continue ");
        })
        .then(function() {
            query.text = 'CREATE DATABASE test;';
            console.log("Trying to create test database. Executing query: ", query.text);
            return client.query(query);
        })
        .then(function() {
            query.text = 'GRANT ALL PRIVILEGES ON DATABASE test TO ' +
                config.postgres.su_username + '; ' +
                'GRANT CONNECT ON DATABASE test TO ' +
                config.postgres.username + ';';
            console.log("Trying to create test database. Executing query: ", query.text);
            return client.query(query);
        })
        .catch(function(err) {
            console.log("Cannot create db test: " + err);
            console.log("OK to continue ");
        })
        .then(() => {
            console.log("Trying to init DB models ...");
            return models.initModels(true);

        })
        .then(() => {
            console.log("Trying to create DB models ...");
            return models.initSchema();

        })
        .catch(function(err) {
            console.log("Cannot create models: " + err);
            console.log("OK to continue ");
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
