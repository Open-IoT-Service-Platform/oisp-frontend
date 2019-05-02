var Accounts = require('./../models/accounts'),
    Settings = require('./../models/settings'),
    Users = require('./../models/users'),
    UserAccounts = require('./../models/userAccounts'),
    ComponentTypes = require('./../models/componentTypes'),
    ComplexCommands = require('./../models/complexCommands'),
    Commands = require('./../models/commands'),
    Rules = require('./../models/rules'),
    Invites = require('./../models/invites'),
    Devices = require('./../models/devices'),
    DeviceTags = require('./../models/deviceTags'),
    DeviceAttributes = require('./../models/deviceAttributes'),
    DeviceComponents = require('./../models/deviceComponents'),
    UserInteractionTokens = require('./../models/userInteractionTokens'),
    Alerts = require('./../models/alerts'),
    Actuations = require('./../models/actuations'),
    AlertComments = require('./../models/alertComments'),
    ConnectionBindings = require('./../models/connectionBindings'),
    DeviceComponentMissingExportDays = require('./../models/deviceComponentMissingExportDays'),
    PurchasedLimits = require('./../models/purchasedLimits');


module.exports.fillModels = function (sequelize, DataTypes) {
    var accounts = new Accounts(sequelize, DataTypes),
        actuations = new Actuations(sequelize, DataTypes),
        users = new Users(sequelize, DataTypes),
        settings = new Settings(sequelize, DataTypes),
        userAccounts = new UserAccounts(sequelize, DataTypes),
        componentTypes = new ComponentTypes(sequelize, DataTypes),
        rules = new Rules(sequelize, DataTypes),
        complexCommands = new ComplexCommands(sequelize, DataTypes),
        commands = new Commands(sequelize, DataTypes),
        devices = new Devices(sequelize, DataTypes),
        deviceAttributes = new DeviceAttributes(sequelize, DataTypes),
        deviceTags = new DeviceTags(sequelize, DataTypes),
        invites = new Invites(sequelize, DataTypes),
        deviceComponents = new DeviceComponents(sequelize, DataTypes),
        deviceComponentMissingExportDays = new DeviceComponentMissingExportDays(sequelize, DataTypes),
        userInteractionTokens = new UserInteractionTokens(sequelize, DataTypes),
        alerts = new Alerts(sequelize, DataTypes),
        connectionBindings = new ConnectionBindings(sequelize, DataTypes),
        purchasedLimits = new PurchasedLimits(sequelize, DataTypes),
        alertComments = new AlertComments(sequelize, DataTypes);

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
            allowNull: false,
        },
        sourceKey: 'externalId'
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
            allowNull: false,
        },
        targetKey: 'externalId'
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

    return {
        accounts: accounts,
        users: users,
        settings: settings,
        userAccounts: userAccounts,
        componentTypes: componentTypes,
        rules: rules,
        complexCommands: complexCommands,
        commands: commands,
        devices: devices,
        deviceAttributes: deviceAttributes,
        deviceTags: deviceTags,
        invites: invites,
        deviceComponents: deviceComponents,
        userInteractionTokens: userInteractionTokens,
        alerts: alerts,
        actuations: actuations,
        connectionBindings: connectionBindings,
        purchasedLimits: purchasedLimits,
        deviceComponentMissingExportDays: deviceComponentMissingExportDays,
        alertComments: alertComments
    };
};
