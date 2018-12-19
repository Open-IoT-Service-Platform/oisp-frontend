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
var httpContext = require('express-http-context'),
    tracer = require('../../../lib/express-jaeger/').tracer,
    Sequelize = require('sequelize'),
    config = require('../../../config').postgres,
    accounts = require('./accounts'),
    settings = require('./settings'),
    userAccounts = require('./userAccounts'),
    users = require('./users'),
    componentTypes = require('./componentTypes'),
    complexCommands = require('./complexCommands'),
    commands = require('./commands'),
    rules = require('./rules'),
    invites = require('./invites'),
    devices = require('./devices'),
    deviceAttributes = require('./deviceAttributes'),
    deviceTags = require('./deviceTags'),
    deviceComponents = require('./deviceComponents'),
    userInteractionTokens = require('./userInteractionTokens'),
    actuations = require('./actuations'),
    alerts = require('./alerts'),
    alertComments = require('./alertComments'),
    connectionBindings = require('./connectionBindings'),
    purchasedLimits = require('./purchasedLimits'),
    deviceComponentMissingExportDays = require('./deviceComponentMissingExportDays'),
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

var origQueryFunc = sequelize.query;
function patchQuery() {
    return function(sql, options) {
        var initSpan = httpContext.get('initSpan');
        var span = tracer.startSpan('postgres-call', { childOf: initSpan });
        return origQueryFunc.apply(this, arguments).then(
            result => {
                span.finish();
                return result;
            },
            err => {
                span.finish();
                throw err;
            }
        );
    }
}
sequelize['query'] = patchQuery();

var Accounts = new accounts(sequelize, Sequelize);
var Actuations = new actuations(sequelize, Sequelize);
var Users = new users(sequelize, Sequelize);
var Settings = new settings(sequelize, Sequelize);
var UserAccounts = new userAccounts(sequelize, Sequelize);
var ComponentTypes = new componentTypes(sequelize, Sequelize);
var Rules = new rules(sequelize, Sequelize);
var ComplexCommands = new complexCommands(sequelize, Sequelize);
var Commands = new commands(sequelize, Sequelize);
var Devices = new devices(sequelize, Sequelize);
var DeviceAttributes = new deviceAttributes(sequelize, Sequelize);
var DeviceTags = new deviceTags(sequelize, Sequelize);
var Invites = new invites(sequelize, Sequelize);
var DeviceComponents = new deviceComponents(sequelize, Sequelize);
var DeviceComponentMissingExportDays = new deviceComponentMissingExportDays(sequelize, Sequelize);
var UserInteractionTokens = new userInteractionTokens(sequelize, Sequelize);
var Alerts = new alerts(sequelize, Sequelize);
var ConnectionBindings = new connectionBindings(sequelize, Sequelize);
var PurchasedLimits = new purchasedLimits(sequelize, Sequelize);
var AlertComments = new alertComments(sequelize, Sequelize);

Users.hasMany(Settings, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});

Users.hasMany(UserInteractionTokens, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});

Settings.belongsTo(Accounts, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: true
    }
});

UserInteractionTokens.belongsTo(Users, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'userId',
        allowNull: false
    }
});

Accounts.hasMany(ComponentTypes, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

Accounts.hasMany(PurchasedLimits, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

Accounts.hasMany(Rules, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

Accounts.hasMany(Commands, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

Accounts.hasMany(Invites, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

Invites.belongsTo(Accounts, {
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

Accounts.hasMany(Devices, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

Accounts.hasMany(Alerts, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

ComplexCommands.hasMany(Commands, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'complexCommandId',
        allowNull: false
    }
});

Devices.belongsTo(Accounts, {
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

Devices.hasMany(DeviceComponents, {
    as: 'deviceComponents',
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

Devices.hasMany(Alerts, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

Devices.hasMany(ConnectionBindings, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

DeviceComponents.belongsTo(ComponentTypes, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'componentTypeId',
        allowNull: false
    }
});

DeviceComponents.belongsTo(Devices, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

DeviceComponents.hasMany(Actuations, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'componentId',
        allowNull: false
    }
});

Devices.hasMany(DeviceAttributes, {
    as: 'attributes',
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

Devices.hasMany(DeviceTags, {
    as: 'tags',
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

Rules.hasMany(Alerts, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'externalId',
        allowNull: false
    }
});


Alerts.belongsTo(Accounts, {
    foreignKey: {
        name: 'accountId',
        allowNull: false
    }
});

Alerts.belongsTo(Devices, {
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

DeviceTags.belongsTo(Devices, {
    foreignKey: {
        name: 'deviceId',
        allowNull: false
    }
});

Alerts.belongsTo(Rules, {
    foreignKey: {
        name: 'externalId',
        allowNull: false
    }
});

Actuations.belongsTo(DeviceComponents, {
    foreignKey: {
        name: 'componentId',
        allowNull: false
    }
});

DeviceComponents.hasMany(DeviceComponentMissingExportDays, {
    onDelete: 'CASCADE',
    foreignKey: {
        name: 'componentId',
        allowNull: false
    }
});

DeviceComponentMissingExportDays.belongsTo(DeviceComponents, {
    foreignKey: {
        name: 'componentId',
        allowNull: false
    }
});


Accounts.belongsToMany(Users, {through: 'user_accounts'});
Users.belongsToMany(Accounts, {through: 'user_accounts'});
Alerts.hasMany(AlertComments, {as: 'Comments'});

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

module.exports.accounts = Accounts;
module.exports.users = Users;
module.exports.settings = Settings;
module.exports.userAccounts = UserAccounts;
module.exports.componentTypes = ComponentTypes;
module.exports.rules = Rules;
module.exports.complexCommands = ComplexCommands;
module.exports.commands = Commands;
module.exports.invites = Invites;
module.exports.devices = Devices;
module.exports.deviceAttributes = DeviceAttributes;
module.exports.deviceTags = DeviceTags;
module.exports.invites = Invites;
module.exports.deviceComponents = DeviceComponents;
module.exports.userInteractionTokens = UserInteractionTokens;
module.exports.alerts = Alerts;
module.exports.actuations = Actuations;
module.exports.connectionBindings = ConnectionBindings;
module.exports.purchasedLimits = PurchasedLimits;
module.exports.deviceComponentMissingExportDays = DeviceComponentMissingExportDays;
module.exports.alertComments = AlertComments;

module.exports.sequelize = sequelize;
