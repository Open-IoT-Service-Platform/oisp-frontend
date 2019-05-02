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
'use strict';
var contextProvider = require('../../../lib/context-provider'),
    opentracing = require('opentracing'),
    tracer = require('../../../lib/express-jaeger').tracer,
    spanContext = require('../../../lib/express-jaeger').spanContext,
    shimmer = require('shimmer'),
    Sequelize = require('sequelize'),
    config = require('../../../config').postgres,
    jaegerConfig = require('../../../config').jaeger,
    modelsHelper = require('../helpers/modelsHelper'),
    logger = require('../../../lib/logger').init(),
    fs = require('fs'),
    Q = require('q'),
    postgresProvider = require('../../postgresql');

var getSequelizeOptions = function() {
    var options = config.options;
    options.logging = function(entry) {
        logger.debug(entry);
    };
    return options;
};

var super_user_sequelize = new Sequelize(
    config.database,
    config.su_username,
    config.su_password,
    getSequelizeOptions()
);


var sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    getSequelizeOptions()
);

// Patch sequelize.query for jaeger support
function wrapQuery(original) {
    /*jshint -W098 */
    return function wrappedQuery (sql, options) {
        const context = contextProvider.instance();
        var fatherSpan = context.get(spanContext.parent);
        // Track if request coming from express
        if (!fatherSpan) {
            fatherSpan = {};
        }
        var span = tracer.startSpan('postgres-call', { childOf: fatherSpan.span });
        span.log({
            event: 'postgres query',
            query: sql
        });
        return original.apply(this, arguments).then(
            result => {
                span.finish();
                return result;
            },
            err => {
                span.setTag(opentracing.Tags.ERROR, true);
                span.log({
                    event: 'postgres query error',
                    err: err,
                    message: err.message,
                    stack: err.stack
                });
                span.finish();
                throw err;
            }
        );
    };
    /*jshint -W098 */
}

if (jaegerConfig.tracing) {
    shimmer.wrap(sequelize, 'query', wrapQuery);
}

modelsHelper.fillModels(super_user_sequelize, Sequelize);
var models = modelsHelper.fillModels(sequelize, Sequelize);

var executeSql = function (sql, transaction) {
    return super_user_sequelize.query(sql, {transaction: transaction});
};

var executeScriptsFromFiles = function(path, files, transaction) {
    var promisesToExecute = [];
    return Q.allSettled(files.map(function (fileName) {
        return Q.nfcall(fs.readFile, __dirname + path + fileName, 'utf-8')
            .then(function (sql) {
                promisesToExecute.push(executeSql(sql, transaction));
            });
    }))
        .then(function () {
            return promisesToExecute.reduce(Q.when, new Q());
        });
};

var readScriptsFromFile = function(path) {
    return Q.nfcall(fs.readdir, __dirname + path)
        .then(function (files) {
            if (!files || !Array.isArray(files)) {
                throw new Error('Unable to read database schema scripts');
            }
            files.sort();
            return files;
        });
};

var executeScriptsWithTransaction = function() {
    var path = '/../../../deploy/postgres/base/';

    return readScriptsFromFile(path)
        .then(function(files) {
            return postgresProvider.superUserStartTransaction()
                .then(function(transaction) {
                    return executeScriptsFromFiles(path, files, transaction)
                        .then(function () {
                            return postgresProvider.commit(transaction)
                                .then(function() {
                                    logger.info('Database schema updated');
                                });
                        })
                        .catch(function (err) {
                            return postgresProvider.rollback(transaction)
                                .then(function() {
                                    throw err;
                                });
                        });
                });
        });
};

var executeScriptsWithoutTransaction = function () {
    var path = '/../../../deploy/postgres/base/no_transaction_scripts/';

    return readScriptsFromFile(path)
        .then(function (files) {
            return executeScriptsFromFiles(path, files)
                .then(function () {
                    logger.info('Database schema updated');
                });
        });
};

var grantPermissions = function() {
    var permissionsQuery =
        'GRANT USAGE ON SCHEMA dashboard TO oisp_user;' +
        'GRANT USAGE ON ALL SEQUENCES IN SCHEMA dashboard TO oisp_user;' +
        'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA dashboard TO oisp_user;';

    return postgresProvider.superUserStartTransaction()
        .then(transaction => {
            return executeSql(permissionsQuery, transaction)
                .then(() => {
                    return postgresProvider.commit(transaction);
                })
                .catch(err => {
                    return postgresProvider.rollback(transaction).then(() => {
                        throw err;
                    });
                });
        })
        .catch(err => {
            throw err;
        });
};

module.exports = models;
module.exports.super_user_sequelize = super_user_sequelize;
module.exports.sequelize = sequelize;

module.exports.initSchema = function () {
    return super_user_sequelize.createSchema('dashboard')
        .then(() => {
            return super_user_sequelize.sync();
        })
        .then(() => {
            return executeScriptsWithTransaction();
        })
        .then(() => {
            return executeScriptsWithoutTransaction();
        })
        .then(() => {
            return grantPermissions();
        })
        .then(() => {
            logger.info('Created database schema');
        })
        .catch(err => {
            logger.error('Unable to create database schema: ' + err);
        });
};
