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

var helper = require('./helper');

var convertDatesToTimestamps = function (entity) {
    entity.created = new Date(entity.created).getTime();
    entity.updated = new Date(entity.updated).getTime();
};

var removeDates = function (entity) {
    if (entity) {
        delete entity.created;
        delete entity.updated;
    }
};

var removesEmptyFields = function (entity) {
    if (!entity) {
        return;
    }

    Object.keys(entity).forEach(function (key) {
        if (!entity[key]) {
            delete entity[key];
        }
    });
};

var usersInterpreter = function (lookUpTable, inverseLookUpTable) {

    var mapUserAccounts = function (userData, isExtended) {
        var accountsForApp = {};
        if (userData.accounts) {
            userData.accounts.map(function (account) {
                if (account) {
                    if (isExtended === true) {
                        accountsForApp[account.id] = {
                            name: account.dataValues.name,
                            role: account.dataValues.user_accounts.role,
                            healthTimePeriod: account.dataValues.healthTimePeriod
                        };
                    } else {
                        accountsForApp[account.id] = account.dataValues.user_accounts.role;
                    }
                }
            });

            userData.accounts = accountsForApp;
        }
    };

    return {
        toApp: function (userEntity, isExtended) {
            var userData = null;

            if (userEntity) {
                userData = userEntity.dataValues;
                mapUserAccounts(userData, isExtended);
            }

            return helper.translate(inverseLookUpTable, userData, function (entity) {
                if (entity) {
                    removesEmptyFields(entity);
                    convertDatesToTimestamps(entity);
                    delete entity.provider;
                }
                return entity;
            });
        },
        toDb: function (entity) {
            return helper.translate(lookUpTable, entity);
        },
        lookUp: function () {
            return lookUpTable;
        }
    };
};

var componentsInterpreter = function (lookUpTable, inverseLookUpTable) {
    return {
        toApp: function (entity) {
            var values = null;
            if (entity) {
                values = entity.dataValues;
                if ('command' in values && values.command === null) {
                    delete values.command;
                }
                if ('icon' in values) {
                    delete values.icon;
                }
                removeDates(values);
            }

            return helper.translate(inverseLookUpTable, values, helper.asAppId);
        },
        toDb: function (entity) {
            entity = helper.removeDbId(entity);
            return helper.translate(lookUpTable, entity);
        },
        lookUp: function () {
            return lookUpTable;
        }
    };
};

var componentTypes = function () {
    var lookUpTable = {
        _id: 'id',
        id: 'componentTypeId',
        domainId: 'accountId',
        dimension: 'dimension',
        version: 'version',
        type: 'type',
        dataType: 'dataType',
        format: 'format',
        min: 'min',
        max: 'max',
        measureunit: 'measureunit',
        display: 'display',
        default: 'd',
        icon: 'icon',
        created: 'created',
        updated: 'updated',
        command: 'command'
    };

    return componentsInterpreter(lookUpTable, helper.inverse(lookUpTable));
};

var settingsInterpreter = function (lookUpTable, inverseLookUpTable) {
    return {
        toApp: function (entity) {
            var values = null;
            if (entity) {
                values = entity.dataValues;
                if (values.name === null) {
                    delete values.name;
                }
                removeDates(values);
            }

            return helper.translate(inverseLookUpTable, values, helper.asAppId);
        },
        toDb: function (entity) {
            return helper.translate(lookUpTable, entity);
        },
        lookUp: function () {
            return lookUpTable;
        }
    };
};

var invitesInterpreter = function (lookUpTable, inverseLookUpTable) {
    return {
        toApp: function (entity) {
            var values = null;
            if (entity) {
                values = entity.dataValues;
                values.domainId = values.accountId;
                if (values.account) {
                    values.accountName = values.account.name;
                    delete values.account;
                }
                removeDates(values);
            }

            return helper.translate(inverseLookUpTable, values, helper.asAppId);
        },
        toDb: function (entity) {
            return helper.translate(lookUpTable, entity);
        },
        lookUp: function () {
            return lookUpTable;
        }
    };
};

var deviceComponentsInterpreter = function (lookUpTable, inverseLookUpTable) {
    return {
        toApp: function (entity) {
            var values = null;
            if (entity) {
                values = entity.dataValues;
                removeDates(values);

                if (values.componentType) {
                    values.type = values.componentType.dataValues.componentTypeId;
                    values.componentType = componentTypes().toApp(values.componentType);
                }

            }

            return helper.translate(inverseLookUpTable, values, function (entity) {

                delete entity.deviceId;
                return entity;
            });
        },
        toDb: function(entity){
            return helper.translate(lookUpTable, entity);
        }
    };
};

var deviceComponents = function() {

    var lookUpTable = {
        cid: 'componentId',
        name: 'name',
        deviceId: 'deviceId'
    };

    return deviceComponentsInterpreter(lookUpTable, helper.inverse(lookUpTable));
};

var deviceInterpreter = function (lookUpTable, inverseLookUpTable) {

    var parseDeviceAttributes = function (entity) {
        if (entity.attributes && entity.attributes.length > 0) {
            var attributesObject = {};
            entity.attributes.forEach(function (attribute) {
                attributesObject[attribute.key] = attribute.value;
            });
            entity.attributes = attributesObject;
        } else {
           entity.attributes = {};
        }
    };

    var parseDeviceTags = function (entity) {
        if (entity.tags && entity.tags.length > 0) {
            var tags = [];
            entity.tags.forEach(function (tag) {
                tags.push(tag.value);
            });
            entity.tags = tags;
        } else {
            delete entity.tags;
        }
    };

    var parseContactData = function (entity) {
        if (entity.phone || entity.email) {
            entity.contact = {
                phone: entity.phone,
                email: entity.email
            };
        } else {
            entity.contact = {};
        }
        delete entity.phone;
        delete entity.email;
    };

    var parseComponents = function(entity) {
        var components = entity.components;
        if (components && Array.isArray(components)) {
            var i = 0;
            for (i = 0; i < components.length; i++) {
                components[i] = deviceComponents().toApp(components[i]);
            }
        } else {
            components = [];
        }
    };

    return {
        toApp: function (entity) {
            var values = null;
            if (entity) {
                values = entity.dataValues;
            }

            return helper.translate(inverseLookUpTable, values, function (entity) {
                if (entity) {
                    removesEmptyFields(entity);
                    convertDatesToTimestamps(entity);
                    delete entity.updated;
                    delete entity.lastVisit;

                    parseComponents(entity);
                    parseContactData(entity);
                    parseDeviceTags(entity);
                    parseDeviceAttributes(entity);
                }
                return entity;
            });
        },
        toDb: function (entity) {
            if (entity && entity.contact) {
                entity.email = entity.contact.email;
                entity.phone = entity.contact.phone;
                delete entity.contact;
            }
            return helper.translate(lookUpTable, entity);
        },
        toDbValues: function(values) {
            var result = {};
            if (values) {
                Object.keys(values).forEach(function (key) {
                    if (values[key] in lookUpTable) {
                        result[key] = lookUpTable[values[key]];
                    } else {
                        result[key] = values[key];
                    }
                });
            }
            return result;
        },
        lookUp: function () {
            return lookUpTable;
        }
    };
};

var devices = function () {
    var lookUpTable = {
        deviceId: 'id',
        gatewayId: 'gatewayId',
        domainId: 'accountId',
        name: 'name',
        loc: 'loc',
        description: 'description',
        status: 'status',
        tags: 'tags',
        attributes: 'attributes',
        created: 'created',
        components: 'deviceComponents'
    };

    return deviceInterpreter(lookUpTable, helper.inverse(lookUpTable));
};

var commandInterpreter = function (lookUpTable, inverseLookUpTable) {
    return {
        toApp: function (entity) {
            var values = null;
            if (entity) {
                values = entity.dataValues;
                delete values.complexCommandId;
                delete values.id;

                removeDates(values);
            }

            return helper.translate(inverseLookUpTable, values, helper.asAppId);
        },
        toDb: function (entity) {
            return helper.translate(lookUpTable, entity, helper.removeDbId);
        },
        lookUp: function () {
            return lookUpTable;
        }
    };
};

var commands = function () {
    var lookUpTable = {
        id: 'id',
        complexCommandId: 'complexCommandId',
        componentId: 'componentId',
        transport: 'transport',
        parameters: 'parameters',
        created: 'created',
        updated: 'updated'
    };

    return commandInterpreter(lookUpTable, helper.inverse(lookUpTable));
};

var complexCommandInterpreter = function (lookUpTable, inverseLookUpTable) {
    return {
        toApp: function (entity) {
            var values = null;
            if (entity) {
                values = entity.dataValues;

                if (values.commands) {
                    values.commands = values.commands.map(function (command) {
                        return commands().toApp(command);
                    });
                }

                removeDates(values);
            }

            return helper.translate(inverseLookUpTable, values, helper.asAppId);
        },
        toDb: function (entity) {
            if (entity && entity.commands) {
                entity.commands = entity.commands.map(function (command) {
                    return commands().toDb(command);
                });
            }

            return helper.translate(lookUpTable, entity, helper.removeDbId);
        },
        lookUp: function () {
            return lookUpTable;
        }
    };
};


var complexCommands = function () {
    var lookUpTable = {
        id: 'name',
        accountId: 'accountId',
        commands: 'commands',
        created: 'created',
        updated: 'updated'
    };

    return complexCommandInterpreter(lookUpTable, helper.inverse(lookUpTable));
};

var accountsInterpreter = function (lookUpTable, inverseLookUpTable) {

    var parseAccountDevice = function(accountDevices) {
        if(accountDevices) {
            var i = 0;
            for (i = 0; i < accountDevices.length; i++) {
                accountDevices[i] = devices().toApp(accountDevices[i]);
            }
        }
    };

    return {
        toApp: function (entity) {
            var values = null;
            if (entity) {
                values = entity.dataValues;
            }
            return helper.translate(inverseLookUpTable, values, function (entity) {
                if (entity) {
                    convertDatesToTimestamps(entity);
                    entity.activation_code_expire_date = new Date(entity.activation_code_expire_date).getTime();
                    parseAccountDevice(entity.devices);
                }
                return entity;
            });
        },
        toDb: function (entity) {
            return helper.translate(lookUpTable, entity);
        },
        lookUp: function () {
            return lookUpTable;
        }
    };
};

var rulesInterpreter = function (lookUpTable, inverseLookUpTable) {
    var parsePupulations = function (entity) {
        if (entity.devices || entity.deviceTags || entity.deviceAttributes) {
            entity.population = {};

            entity.population.ids = entity.devices;
            delete entity.devices;

            entity.population.tags = entity.deviceTags;
            delete entity.deviceTags;

            entity.population.attributes = entity.deviceAttributes;
            delete entity.deviceAttributes;
        }
    };

    var createRelations = function(entity) {
        if (entity.population) {
            if (entity.population.name) {
                entity.deviceNames = [entity.population.name];
            }
            if (entity.population.ids && entity.population.ids.length > 0) {
                entity.devices = entity.population.ids;
            }
            if (entity.population.tags && entity.population.tags.length > 0) {
                entity.deviceTags = entity.population.tags;
            }
            if (entity.population.attributes) {
                entity.deviceAttributes = entity.population.attributes;
            }
        }
    };

    return {
        toApp: function (entity) {
            var values = null;
            if (entity) {
                values = entity.dataValues;
                convertDatesToTimestamps(values);
            }
            return helper.translate(inverseLookUpTable, values,  function (entity) {
                if (entity) {
                    parsePupulations(entity);
                    removesEmptyFields(entity);
                }
                return entity;
            });
        },
        toDb: function (entity) {
            if (entity) {
               createRelations(entity);
            }
            return helper.translate(lookUpTable, entity, helper.removeDbId);
        },
        lookUp: function () {
            return lookUpTable;
        }
    };
};

var alertsInterpreter = function (lookUpTable, inverseLookUpTable) {
    var parseComments = function(entity) {
        var comments = entity.Comments;
        if(comments && Array.isArray(comments)) {
            var i = 0;
            for (i = 0; i < comments.length; i++ ) {
                comments[i] = {text: comments[i].text, timestamp: comments[i].created, user: comments[i].user};
            }
        }
    };
    return {
        toApp: function (entity) {
            var values = null;
            if (entity) {
                values = entity.dataValues;
                convertDatesToTimestamps(values);
                parseComments(entity);
            }
            return helper.translate(inverseLookUpTable, values,  function (entity) {
                if (entity) {
                    removesEmptyFields(entity);
                    entity.triggered = new Date(entity.triggered).getTime();
                    entity.dashboardAlertReceivedOn = new Date(entity.dashboardAlertReceivedOn).getTime();
                    entity.dashboardObservationReceivedOn = new Date(entity.dashboardObservationReceivedOn).getTime();
                }
                return entity;
            });
        },
        toDb: function (entity) {
            var result = helper.translate(lookUpTable, entity, helper.removeDbId);
            result.externalId = entity.externalId;
            return result;
        },
        lookUp: function () {
            return lookUpTable;
        }
    };
};

var actuationsInterpreter = function (lookUpTable, inverseLookUpTable) {
    return {
        toApp: function (entity) {
            var values = null;
            if (entity) {
                values = entity.dataValues;
                convertDatesToTimestamps(values);
            }
            return helper.translate(inverseLookUpTable, values,  function (entity) {
                if (entity) {
                    entity["accountId"] = entity.device_component.device.dataValues.accountId;
                    entity["deviceId"] = entity.device_component.device.dataValues.id;
                    entity["gatewayId"] = entity.device_component.device.dataValues.gatewayId;
                    entity["parameters"] = JSON.parse(entity.parameters);
                    removesEmptyFields(entity);
                }
                return entity;
            });
        },
        toDb: function (entity) {
            return helper.translate(lookUpTable, entity, helper.removeDbId);
        },
        lookUp: function () {
            return lookUpTable;
        }
    };
};

var users = function () {
    var lookUpTable = {
        id: 'id',
        accounts: 'accounts',
        attributes: 'attrs',
        email: 'email',
        password: 'password',
        salt: 'salt',
        verified: 'verified',
        provider: 'provider',
        termsAndConditions: 'termsAndConditions',
        created: 'created',
        updated: 'updated'
    };

    return usersInterpreter(lookUpTable, helper.inverse(lookUpTable));
};

var accounts = function () {
    var lookUpTable = {
        name: 'name',
        public_id: 'id',
        healthTimePeriod: 'healthTimePeriod',
        created: 'created',
        updated: 'updated',
        exec_interval: 'exec_interval',
        base_line_exec_interval: 'base_line_exec_interval',
        cd_model_frequency: 'cd_model_frequency',
        cd_execution_frequency: 'cd_execution_frequency',
        data_retention: 'data_retention',
        attributes: 'attrs',
        settings: 'settings',
        activation_code: 'activation_code',
        activation_code_expire_date: "activation_code_expire_date"
    };

    return accountsInterpreter(lookUpTable, helper.inverse(lookUpTable));
};

var userInteractionTokenInterpreter = function (lookUpTable, inverseLookUpTable) {
    return {
        toApp: function (userEntity) {
            var tokenData = null;

            if (userEntity) {
                tokenData = userEntity.dataValues;
            }

            return helper.translate(inverseLookUpTable, tokenData, function(entity) {
                if (entity) {
                    entity.user = users().toApp(entity.user);
                    if (entity.user) {
                        entity.email = entity.user.email;
                    }
                }
                return entity;
            });
        },
        toDb: function (entity) {
            return helper.translate(lookUpTable, entity);
        },
        lookUp: function () {
            return lookUpTable;
        }
    };
};

var userInteractionTokens = function(){
    var lookUpTable = {
        id: 'id',
        userId: 'userId',
        type: 'type',
        expiresAt: 'expiresAt',
        on: 'created'
    };
    return userInteractionTokenInterpreter(lookUpTable, helper.inverse(lookUpTable));
};

var settings = function () {
    var lookUpTable = {
        id: 'id',
        userId: 'userId',
        domainId: 'accountId',
        category: 'type',
        name: 'name',
        public: 'public',
        default: 'default',
        value: 'value'
    };

    return settingsInterpreter(lookUpTable, helper.inverse(lookUpTable));
};

var invites = function () {
    var lookUpTable = {
        _id: 'id',
        accountId: 'accountId',
        email: 'email'
    };

    return invitesInterpreter(lookUpTable, helper.inverse(lookUpTable));
};

var rules = function () {
    var lookUpTable = {
        id: 'id',
        externalId: 'externalId',
        domainId: 'accountId',
        actions: 'actions',
        status: 'status',
        name: 'name',
        owner: 'owner',
        conditions: 'conditions',
        resetType: 'resetType',
        priority: 'priority',
        creationDate: 'created',
        lastUpdateDate: 'updated',
        naturalLanguage: 'naturalLanguage'
    };

    return rulesInterpreter(lookUpTable, helper.inverse(lookUpTable));
};

var alerts = function () {
    var lookUpTable = {
        alertId: 'id',
        ruleId: 'externalId',
        accountId: 'accountId',
        deviceId: 'deviceId',
        reset: 'reset',

        // rule_engine received timestamp value
        triggered: 'triggered',
        dashboardAlertReceivedOn: 'dashboardAlertReceivedOn',
        dashboardObservationReceivedOn: 'dashboardObservationReceivedOn',

        status: 'status',
        ruleName: 'ruleName',
        priority: 'priority',
        naturalLangAlert: 'naturalLangAlert',
        conditions: 'conditions',
        comments: 'Comments'
    };

    return alertsInterpreter(lookUpTable, helper.inverse(lookUpTable));
};

var actuations = function () {
    var lookUpTable = {
        id: 'id',
        created: 'created',
        transport: 'transport',
        componentId: 'componentId',
        command: 'command',
        parameters: 'parameters'
    };

    return actuationsInterpreter(lookUpTable, helper.inverse(lookUpTable));
};

var deviceComponentMissingExportDaysInterpreter = function (lookUpTable) {
    return {
        toApp: function (entity) {
            var values = null;
            if (entity) {
                values = entity.dataValues;
            }
            return values;
        },
        toDb: function (entity) {
            return helper.translate(lookUpTable, entity);
        },
        lookUp: function () {
            return lookUpTable;
        }
    };
};

var deviceComponentMissingExportDays = function () {
    var lookUpTable = {
        componentId: 'componentId',
        day: 'day'
    };

    return deviceComponentMissingExportDaysInterpreter(lookUpTable);
};

module.exports = {
    users: users,
    settings: settings,
    accounts: accounts,
    componentTypes: componentTypes,
    devices: devices,
    deviceComponents: deviceComponents,
    invites: invites,
    rules: rules,
    alerts: alerts,
    complexCommands: complexCommands,
    userInteractionTokens: userInteractionTokens,
    actuations: actuations,
    deviceComponentMissingExportDays: deviceComponentMissingExportDays
};
