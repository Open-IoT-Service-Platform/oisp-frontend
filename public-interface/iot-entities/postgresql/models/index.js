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
    Q = require('q'),
    uuid = require('node-uuid'),
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

var grantPermissions = function() {
    var permissionsQuery =
        'GRANT USAGE ON SCHEMA dashboard TO ' + config.username + ';' +
        'GRANT USAGE ON ALL SEQUENCES IN SCHEMA dashboard TO ' + config.username + ';' +
        'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA dashboard TO ' + config.username + ';';

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

var createDefaultComponentCatalog = function() {
    var promises = [];

    modelsHelper.defaultComponents.map(function(cmp) {
        var component = {
            id: uuid.v4(),
            componentTypeId: cmp[0],
            accountId: null,
            dimension: cmp[1],
            default: true,
            display: cmp[2],
            format: cmp[3],
            measureunit: cmp[4],
            version: cmp[5],
            type: cmp[6],
            dataType: cmp[7],
            command: cmp[8],
            icon: null,
            min: cmp[9],
            max: cmp[10]
        };

        var filter = {
            where: {
                componentTypeId: cmp[0],
                default: true
            },
            defaults: component,
        };

        promises.push(postgresProvider.superUserStartTransaction().then(t => {
            filter.transaction = t;
            return models.componentTypes.findOrCreate(filter)
                .then(() => {
                    return postgresProvider.commit(t);
                })
                .catch(err => {
                    return postgresProvider.rollback(t).then(() => {
                        throw err;
                    });
                });
        }));
    });

    return Q.all(promises);
};

module.exports = models;
module.exports.super_user_sequelize = super_user_sequelize;
module.exports.sequelize = sequelize;

module.exports.createDatabase = function () {
    return super_user_sequelize.createSchema('dashboard')
        .then(() => {
            return super_user_sequelize.sync({ force: true });
        })
        .then(() => {
            return grantPermissions();
        })
        .then(() => {
            return createDefaultComponentCatalog();
        })
        .then(() => {
            logger.info('Database created');
        })
        .catch(err => {
            logger.error('Unable to create database: ' + err);
        });
};

module.exports.initSchema = function () {
    return super_user_sequelize.createSchema('dashboard')
        .then(() => {
            return super_user_sequelize.sync();
        })
        .then(() => {
            return grantPermissions();
        })
        .then(() => {
            logger.info('Database schema created');
        })
        .catch(err => {
            logger.error('Unable to create database schema: ' + err);
        });
};
