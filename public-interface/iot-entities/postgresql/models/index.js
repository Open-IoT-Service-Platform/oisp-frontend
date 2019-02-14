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
    Accounts = require('./accounts'),
    Settings = require('./settings'),
    UserAccounts = require('./userAccounts'),
    Users = require('./users'),
    ComponentTypes = require('./componentTypes'),
    ComplexCommands = require('./complexCommands'),
    Commands = require('./commands'),
    Rules = require('./rules'),
    Invites = require('./invites'),
    Devices = require('./devices'),
    DeviceAttributes = require('./deviceAttributes'),
    DeviceTags = require('./deviceTags'),
    DeviceComponents = require('./deviceComponents'),
    UserInteractionTokens = require('./userInteractionTokens'),
    Actuations = require('./actuations'),
    Alerts = require('./alerts'),
    AlertComments = require('./alertComments'),
    ConnectionBindings = require('./connectionBindings'),
    PurchasedLimits = require('./purchasedLimits'),
    DeviceComponentMissingExportDays = require('./deviceComponentMissingExportDays'),
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
        if (!fatherSpan)
        {fatherSpan = {};}
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

var accounts = new Accounts(sequelize, Sequelize);
var actuations = new Actuations(sequelize, Sequelize);
var users = new Users(sequelize, Sequelize);
var settings = new Settings(sequelize, Sequelize);
var userAccounts = new UserAccounts(sequelize, Sequelize);
var componentTypes = new ComponentTypes(sequelize, Sequelize);
var rules = new Rules(sequelize, Sequelize);
var complexCommands = new ComplexCommands(sequelize, Sequelize);
var commands = new Commands(sequelize, Sequelize);
var devices = new Devices(sequelize, Sequelize);
var deviceAttributes = new DeviceAttributes(sequelize, Sequelize);
var deviceTags = new DeviceTags(sequelize, Sequelize);
var invites = new Invites(sequelize, Sequelize);
var deviceComponents = new DeviceComponents(sequelize, Sequelize);
var deviceComponentMissingExportDays = new DeviceComponentMissingExportDays(sequelize, Sequelize);
var userInteractionTokens = new UserInteractionTokens(sequelize, Sequelize);
var alerts = new Alerts(sequelize, Sequelize);
var connectionBindings = new ConnectionBindings(sequelize, Sequelize);
var purchasedLimits = new PurchasedLimits(sequelize, Sequelize);
var alertComments = new AlertComments(sequelize, Sequelize);

users.hasMany(settings, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});

users.hasMany(userInteractionTokens, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});

settings.belongsTo(accounts, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: true
    }
});

userInteractionTokens.belongsTo(users, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});

accounts.hasMany(componentTypes, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

accounts.hasMany(purchasedLimits, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

accounts.hasMany(rules, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

accounts.hasMany(commands, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

accounts.hasMany(invites, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

invites.belongsTo(accounts, {
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

accounts.hasMany(devices, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

accounts.hasMany(alerts, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

complexCommands.hasMany(commands, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'complexCommandId',
        allowNull: false
    }
});

devices.belongsTo(accounts, {
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

devices.hasMany(deviceComponents, {
    as: 'deviceComponents',
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

devices.hasMany(alerts, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

devices.hasMany(connectionBindings, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

deviceComponents.belongsTo(componentTypes, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'componentTypeId',
        allowNull: false
    }
});

deviceComponents.belongsTo(devices, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

deviceComponents.hasMany(actuations, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'componentId',
        allowNull: false
    }
});

devices.hasMany(deviceAttributes, {
    as: 'attributes',
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

devices.hasMany(deviceTags, {
    as: 'tags',
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

rules.hasMany(alerts, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'externalId',
        allowNull: false
    }
});


alerts.belongsTo(accounts, {
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

alerts.belongsTo(devices, {
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

deviceTags.belongsTo(devices, {
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

alerts.belongsTo(rules, {
    foreignKey: {
        name: 'externalId',
        allowNull: false
    }
});

actuations.belongsTo(deviceComponents, {
    foreignKey: {
        name: 'componentId',
        allowNull: false
    }
});

deviceComponents.hasMany(deviceComponentMissingExportDays, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'componentId',
        allowNull: false
    }
});

deviceComponentMissingExportDays.belongsTo(deviceComponents, {
    foreignKey: {
        name: 'componentId',
        allowNull: false
    }
});


accounts.belongsToMany(users, {through: 'user_accounts'});
users.belongsToMany(accounts, {through: 'user_accounts'});
alerts.hasMany(alertComments, {as: 'Comments'});

var executeSql = function (sql, transaction) {
    return sequelize.query(sql, {transaction: transaction});
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
            return postgresProvider.startTransaction()
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


exports.initSchema = function () {
    return executeScriptsWithTransaction()
        .then(function() {
            return executeScriptsWithoutTransaction();
        })
        .catch(function (err) {
            logger.error('Unable to create database schema: ' + err);
        });
};

module.exports.accounts = accounts;
module.exports.users = users;
module.exports.settings = settings;
module.exports.userAccounts = userAccounts;
module.exports.componentTypes = componentTypes;
module.exports.rules = rules;
module.exports.complexCommands = complexCommands;
module.exports.commands = commands;
module.exports.invites = invites;
module.exports.devices = devices;
module.exports.deviceAttributes = deviceAttributes;
module.exports.deviceTags = deviceTags;
module.exports.invites = invites;
module.exports.deviceComponents = deviceComponents;
module.exports.userInteractionTokens = userInteractionTokens;
module.exports.alerts = alerts;
module.exports.actuations = actuations;
module.exports.connectionBindings = connectionBindings;
module.exports.purchasedLimits = purchasedLimits;
module.exports.deviceComponentMissingExportDays = deviceComponentMissingExportDays;
module.exports.alertComments = alertComments;

module.exports.sequelize = sequelize;
