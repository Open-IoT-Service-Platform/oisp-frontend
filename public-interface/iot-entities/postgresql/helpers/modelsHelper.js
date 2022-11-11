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

var Accounts = require('./../models/accounts'),
    Settings = require('./../models/settings'),
    Users = require('./../models/users'),
    UsersBase = require('../migrations/models/users'),
    UserAccounts = require('./../models/userAccounts'),
    ComponentTypes = require('./../models/componentTypes'),
    ComplexCommands = require('./../models/complexCommands'),
    Commands = require('./../models/commands'),
    Invites = require('./../models/invites'),
    Devices = require('./../models/devices'),
    DeviceTags = require('./../models/deviceTags'),
    DeviceAttributes = require('./../models/deviceAttributes'),
    DeviceComponents = require('./../models/deviceComponents'),
    UserInteractionTokens = require('./../models/userInteractionTokens'),
    Actuations = require('./../models/actuations'),
    PurchasedLimits = require('./../models/purchasedLimits');

const DESC = "DESC",
    ASC = "ASC";

const NUMERIC_MAX = 1.7976931348623157e+308,
    NUMERIC_MIN = -1.7976931348623157e+308;

const powerswitchCommand = {
    commandString: 'LED.v1.0',
    parameters: [{ name: 'LED', values: '0,1', display: 'switcher' }]
};

const components = [
    ['temperature.v1.0', 'temperature', 'timeSeries', 'float',
        'Degrees Celsius', '1.0', 'sensor', 'Number', null, NUMERIC_MIN,
        NUMERIC_MAX, null],
    ['humidity.v1.0', 'humidity', 'timeSeries', 'float', 'Percent (%)', '1.0',
        'sensor', 'Number', null, null, null],
    ['powerswitch.v1.0', 'powerswitch', 'Binary', 'boolean', null, '1.0',
        'actuator', 'Boolean', powerswitchCommand, null, null]
];


module.exports.defaultComponents = components;

module.exports.fillModels = function (sequelize, DataTypes, baseModels = false) {
    var accounts = new Accounts(sequelize, DataTypes),
        actuations = new Actuations(sequelize, DataTypes),
        users = null,
        settings = new Settings(sequelize, DataTypes),
        userAccounts = new UserAccounts(sequelize, DataTypes),
        componentTypes = new ComponentTypes(sequelize, DataTypes),
        complexCommands = new ComplexCommands(sequelize, DataTypes),
        commands = new Commands(sequelize, DataTypes),
        devices = new Devices(sequelize, DataTypes),
        deviceAttributes = new DeviceAttributes(sequelize, DataTypes),
        deviceTags = new DeviceTags(sequelize, DataTypes),
        invites = new Invites(sequelize, DataTypes),
        deviceComponents = new DeviceComponents(sequelize, DataTypes),
        userInteractionTokens = new UserInteractionTokens(sequelize, DataTypes),
        purchasedLimits = new PurchasedLimits(sequelize, DataTypes);

    if (!baseModels) {
        users = new Users(sequelize, DataTypes);
    } else {
        users = new UsersBase(sequelize, DataTypes);
    }

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
            name: 'deviceUID',
            allowNull: false
        }
    });

    deviceComponents.belongsTo(componentTypes, {
        as: 'componentType',
        onDelete: 'CASCADE',
        foreignKey: {
            name: 'componentTypeId',
            allowNull: false
        }
    });

    deviceComponents.belongsTo(devices, {
        onDelete: 'CASCADE',
        foreignKey: {
            name: 'deviceUID',
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
            name: 'deviceUID',
            allowNull: false
        }
    });

    devices.hasMany(deviceTags, {
        as: 'tags',
        onDelete: 'CASCADE',
        foreignKey: {
            name: 'deviceUID',
            allowNull: false
        }
    });

    deviceTags.belongsTo(devices, {
        foreignKey: {
            name: 'deviceUID',
            allowNull: false
        }
    });

    actuations.belongsTo(deviceComponents, {
        foreignKey: {
            name: 'componentId',
            allowNull: false
        }
    });

    accounts.belongsToMany(users, {through: 'user_accounts'});
    users.belongsToMany(accounts, {through: 'user_accounts'});

    return {
        accounts: accounts,
        users: users,
        settings: settings,
        userAccounts: userAccounts,
        componentTypes: componentTypes,
        complexCommands: complexCommands,
        commands: commands,
        devices: devices,
        deviceAttributes: deviceAttributes,
        deviceTags: deviceTags,
        invites: invites,
        deviceComponents: deviceComponents,
        userInteractionTokens: userInteractionTokens,
        actuations: actuations,
        purchasedLimits: purchasedLimits
    };
};

module.exports.setQueryParameters = function(queryParameters, attributes, filter) {
    if (queryParameters.sort && queryParameters.sort in attributes) {
        var order =  queryParameters.order === "desc" ? DESC : ASC;
        filter.order = [['Device', attributes[queryParameters.sort].fieldName, order]];
    }
    if (queryParameters.limit) {
        filter.limit = queryParameters.limit;
    }
    if (queryParameters.skip) {
        filter.offset = queryParameters.skip;
    }
    if (!filter.where) {
        filter.where = {};
    }
    for (var f in queryParameters) {
        if (f in attributes) {
            try {
                filter.where[attributes[f].fieldName] = JSON.parse(queryParameters[f]);
            } catch (e) {
                filter.where[attributes[f].fieldName] = queryParameters[f];
            }
        }
    }
    return filter;
};
