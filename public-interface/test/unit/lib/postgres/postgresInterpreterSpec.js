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

var expect = require('expect.js'),
    rewire = require('rewire'),
    sinon = require('sinon'),
    postgresInterpreter = rewire('../../../../lib/interpreter/postgresInterpreter'),
    uuid = require('uuid');


describe('postgresInterpreter', function() {
    var accId, interpreter, entity, appObject, result, lookUpTable, compareObjects;
    beforeEach(function(){
        compareObjects = function(objA, objB) {
            expect(JSON.stringify(objA)).to.equal(JSON.stringify(objB));
        };
    });

    describe('deviceInterpreter', function(){
        beforeEach(function(){
            lookUpTable = {
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
            interpreter = postgresInterpreter.devices();
            entity = {
                dataValues: {
                    id: 'deviceId',
                    gatewayId: 'gatewayId',
                    accountId: uuid.v4(),
                    name: 'name',
                    loc: [1,2,3],
                    description: 'description',
                    status: 'status',
                    tags: [{value: 'tag'}],
                    attributes: [{key:'key', value: 'value'}],
                    created: new Date(),
                    deviceComponents: [
                        {
                            dataValues: {
                                deviceId: 'deviceId',
                                componentType: {
                                    dataValues: {
                                        command: {
                                            name: 'name',
                                            value: 'value'
                                        },
                                        icon: 'icon'
                                    }
                                }
                            },
                            componentType: {
                                componentTypeId: 'typeId'
                            }
                        }
                    ]
                }
            };
            appObject = {
                deviceId: "deviceId",
                gatewayId: "gatewayId",
                loc: [1,2,3],
                description: "description",
                status: "status",
                tags: ['tag'],
                atributes: {
                    key: "value"
                },
                created: entity.dataValues.created.getTime(),
                components: [
                    {
                        componentType: {
                            componentTypeId: 'typeId'
                        },
                        type: "typeId"
                    }
                ],
                contact: {}
            };
        });

        it('should interpret db entity to app object', function(done) {
            //execute
            result = interpreter.toApp(entity);

            //attest
            expect(result.domainId).to.equal(entity.dataValues.accountId);
            expect(result.components[0].deviceId).to.equal(undefined);
            expect(result.updated).to.equal(undefined);
            expect(result.contact).not.to.equal(undefined);

            done();
        });

        it('should not return error if argument is undefined', function(done) {
            //execute
            result = interpreter.toApp(undefined);

            //attest
            expect(isNaN(result.created)).to.equal(true);
            compareObjects(result.contact, {});

            done();
        });

        it('should interpret app object to db entity', function(done) {
            // execute
            result = interpreter.toDb(appObject);

            //attest
            expect(result.id).to.equal(entity.dataValues.id);
            expect(JSON.stringify(result.loc)).to.equal(JSON.stringify(entity.dataValues.loc));
            expect(result.gatewayId).to.equal(entity.dataValues.gatewayId);

            done();
        });

        it('should interpret app object to db entity if contact field is undefined', function(done) {
            //prepare
            delete appObject.contact;

            // execute
            result = interpreter.toDb(appObject);

            //attest
            expect(result.id).to.equal(entity.dataValues.id);
            expect(JSON.stringify(result.loc)).to.equal(JSON.stringify(entity.dataValues.loc));
            expect(result.gatewayId).to.equal(entity.dataValues.gatewayId);

            done();
        });

        it('should interpret app object to dbValues entity', function(done) {
            // execute
            result = interpreter.toDbValues(entity);

            //attest
            compareObjects(result, entity);

            done();
        });

        it('should return users lookUpTable', function(done) {
            // execute
            result = interpreter.lookUp();

            //attest
            compareObjects(result, lookUpTable);

            done();
        });
    });

    describe('accountsInterpreter', function(){
        var device;
        beforeEach(function(){
            lookUpTable = {
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
            device = {
                id: 'deviceId',
                    gatewayId: 'gatewayId',
                    accountId: uuid.v4(),
                    name: 'name',
                    loc: [1,2,3],
                    description: 'description',
                    status: 'status',
                    tags: ['tag'],
                    attributes: [{key:'value'}],
                    created: new Date().getTime(),
                    deviceComponents: [
                    {
                        dataValues: {
                            empty: null,
                            deviceId: 'deviceId',
                            componentType: {
                                dataValues: {
                                    command: {
                                        name: 'name',
                                        value: 'value'
                                    },
                                    icon: 'icon'
                                }
                            }
                        },
                        componentType: {
                            componentTypeId: 'typeId'
                        }
                    }
                ]
            };
            interpreter = postgresInterpreter.accounts();
            accId = uuid.v4();
            entity = {
                dataValues: {
                    created: new Date(1234),
                    updated: new Date(12345),
                    activation_code_expire_date: new Date(),
                    devices: [device]
                }
            };
            appObject = {
                updated: new Date(1234).getTime(),
                created: new Date(1234).getTime(),
                activation_code_expire_date: entity.dataValues.activation_code_expire_date.getTime(),
                devices: [
                    {
                        created: 12
                    }
                ]
            };
        });

        it('should interpret db entity to app object', function(done) {
            // execute
            result = interpreter.toApp(entity, true);

            //attest
            expect(result.activation_code_expire_date).to.equal(entity.dataValues.activation_code_expire_date.getTime());
            expect(result.updated).to.equal(entity.dataValues.updated.getTime());

            done();
        });

        it('should not return error if argument is undefined', function(done) {
            // execute
            result = interpreter.toApp(undefined, false);

            //attest
            expect(isNaN(result.created)).to.equal(true);
            expect(isNaN(result.updated)).to.equal(true);

            done();
        });

        it('should interpret app object to db entity', function(done) {
            result = interpreter.toDb(appObject);

            //attest
            compareObjects(result, appObject);

            done();
        });

        it('should return users lookUpTable', function(done) {
            // execute
            result = interpreter.lookUp();

            //attest
            compareObjects(result, lookUpTable);

            done();
        });
    });

    describe('usersInterpreter', function(){
        beforeEach(function(){
            lookUpTable = {
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
            interpreter = postgresInterpreter.users();
            accId = uuid.v4();
            entity = {
                dataValues: {
                    accounts: [{
                        id: accId,
                        dataValues: {
                            user_accounts: {
                                role: 'admin'
                            },
                            name: 'name',
                            healthTimePeriod: Date.now()
                        }
                    }],
                    created: new Date(1234),
                    updated: new Date(12345),
                    provider: 'provider',
                    empty: undefined
                }
            };
            appObject = {
                accounts: {}
            };
            appObject.accounts[accId] = {
                name: 'name',
                role: 'admin',
                created: new Date(1234).getTime(),
                updated: new Date(12345).getTime()
            }
        });

        it('should interpret db entity to app object for user with accounts (extended)', function(done) {
            // execute
            result = interpreter.toApp(entity, true);

            //attest
            expect(result.provider).to.equal(undefined);
            expect(typeof(result.created)).to.equal(typeof(entity.dataValues.created.getTime()));
            expect(result.empty).to.equal(undefined);
            expect(result.accounts[accId].healthTimePeriod).not.to.equal(undefined);

            done();
        });

        it('should interpret db entity to app object for user with accounts (basic)', function(done) {
            // execute
            result = interpreter.toApp(entity, false);

            //attest
            expect(result.provider).to.equal(undefined);
            expect(typeof(result.created)).to.equal(typeof(entity.dataValues.created.getTime()));
            expect(result.empty).to.equal(undefined);

            done();
        });

        it('should not return error if entity is an empty object', function(done) {
            // execute
            result = interpreter.toApp(undefined, false);

            //attest
            expect(isNaN(result.created)).to.equal(true);
            expect(isNaN(result.updated)).to.equal(true);

            done();
        });

        it('should interpret db entity to app object for user without accounts array', function(done) {
            //prepare
            delete entity.dataValues.accounts;

            // execute
            result = interpreter.toApp(entity, true);

            //attest
            expect(result.provider).to.equal(undefined);
            expect(typeof(result.created)).to.equal(typeof(entity.dataValues.created.getTime()));
            expect(result.empty).to.equal(undefined);

            done();
        });

        it('should interpret app object to db entity', function(done) {
            // execute
            result = interpreter.toDb(appObject);

            //attest
            expect(result.accounts[accId]).not.to.equal(undefined);
            expect(result.provider).to.equal(undefined);

            done();
        });

        it('should return users lookUpTable', function(done) {
            // execute
            result = interpreter.lookUp();

            //attest
            compareObjects(result, lookUpTable);

            done();
        });
    });

    describe('componentsInterpreter', function(){
        beforeEach(function(){
            lookUpTable = {
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
            interpreter = postgresInterpreter.componentTypes();
            entity = {
                dataValues: {
                    command: {
                        name: 'name',
                        value: 'value'
                    },
                    icon: 'icon'
                }
            };
            appObject = {
                command: {
                    name: 'name',
                    value: 'value'
                }
            };
        });

        it('should interpret db entity to app object', function(done) {
            //execute
            result = interpreter.toApp(entity);

            //attest
            compareObjects(result, entity.dataValues);

            done();
        });

        it('should not return error if entity is undefined ', function(done) {
            //execute
            result = interpreter.toApp(undefined);

            //attest
            compareObjects(result, {});

            done();
        });

        it('should not return error if entity has empty dataValue ', function(done) {
            //execute
            entity.dataValues = {};
            result = interpreter.toApp(entity);

            //attest
            compareObjects(result, {});

            done();
        });

        it('should interpret db entity without commands to app object', function(done) {
            //prepare
            entity.dataValues.command = null;

            //execute
            result = interpreter.toApp(entity);

            //attest
            compareObjects(result, entity.dataValues);

            done();
        });

        it('should interpret app object to db entity', function(done) {
            // execute
            result = interpreter.toDb(appObject);

            //attest
            compareObjects(result.command, entity.dataValues.command);

            done();
        });

        it('should return users lookUpTable', function(done) {
            // execute
            result = interpreter.lookUp();

            //attest
            compareObjects(result, lookUpTable);

            done();
        });
    });

    describe('settingsInterpreter', function(){
        beforeEach(function(){
            lookUpTable = {
                id: 'id',
                userId: 'userId',
                domainId: 'accountId',
                category: 'type',
                name: 'name',
                public: 'public',
                default: 'default',
                value: 'value'
            };
            interpreter = postgresInterpreter.settings();
            entity = {
                dataValues: {
                    name: 'name',
                    created: new Date(1234),
                    updated: new Date(12345)
                }
            };
            appObject = {
                name: 'name'
            };
        });

        it('should interpret db entity to app object', function(done) {
            //execute
            result = interpreter.toApp(entity);

            //attest
            compareObjects(result, entity.dataValues);
            expect(result.created).to.equal(undefined);
            expect(result.updated).to.equal(undefined);

            done();
        });

        it('should not return error if argument is undefined', function(done) {
            //execute
            result = interpreter.toApp(undefined);

            //attest
            compareObjects(result, {});

            done();
        });

        it('should interpret db entity without name to app object', function(done) {
            //prepare
            entity.dataValues.name = null;

            ///execute
            result = interpreter.toApp(entity);

            //attest
            compareObjects(result, entity.dataValues);
            expect(result.created).to.equal(undefined);
            expect(result.updated).to.equal(undefined);

            done();
        });

        it('should interpret app object to db entity', function(done) {
            // execute
            result = interpreter.toDb(entity);

            //attest
            compareObjects(result, entity);

            done();
        });

        it('should return users lookUpTable', function(done) {
            // execute
            result = interpreter.lookUp();

            //attest
            compareObjects(result, lookUpTable);

            done();
        });
    });

    describe('invitesInterpreter', function(){
        beforeEach(function(){
            lookUpTable = {
                _id: 'id',
                accountId: 'accountId',
                email: 'email'
            };
            interpreter = postgresInterpreter.invites();
            accId = uuid.v4();
            entity = {
                dataValues: {
                    accountId: uuid.v4(),
                    account: {
                        name: 'name'
                    },
                    created: new Date(1234),
                    updated: new Date(12345)
                }
            };
            appObject = {
                accountId: accId,
                domaindId: accId,
                accountName: 'name'
            };
        });

        it('should interpret db entity to app object', function(done) {
            //execute
            result = interpreter.toApp(entity);

            //attest
            compareObjects(result, entity.dataValues);

            done();
        });

        it('should not return error if argument is undefined', function(done) {
            //execute
            result = interpreter.toApp(undefined);

            //attest
            compareObjects(result, {});

            done();
        });

        it('should not return error if account is not defined', function(done) {
            //prepare
            delete entity.dataValues.account;

            //execute
            result = interpreter.toApp(entity);

            //attest
            compareObjects(result.accountId, entity.dataValues.accountId);

            done();
        });

        it('should interpret app object to db entity', function(done) {
            // execute
            result = interpreter.toDb(entity);

            // attest
            compareObjects(result, entity);

            done();
        });

        it('should return users lookUpTable', function(done) {
            // execute
            result = interpreter.lookUp();

            //attest
            compareObjects(result, lookUpTable);

            done();
        });
    });

    describe('deviceComponentsInterpreter', function(){
        beforeEach(function(){
            lookUpTable = {
                cid: 'componentId',
                name: 'name',
                deviceId: 'deviceId'
            };
            interpreter = postgresInterpreter.deviceComponents();
            entity = {
                componentType: {
                    componentTypeId: 'componentTypeId'
                },
                dataValues: {
                    componentType: {
                        componentTypeId: 'componentType',
                        dataValues: {

                            command: {
                                name: 'name',
                                value: 'value'
                            },
                            icon: 'icon'
                        }
                    },
                    created: new Date(1234),
                    updated: new Date(12345)
                }
            };
            appObject = {
                componentType: {
                    command: {
                        name: 'name',
                        value: 'value'
                    }
                }  ,
                type: 'componentTypeId'
            };
        });

        it('should interpret db entity to app object', function(done) {
            //execute
            result = interpreter.toApp(entity);

            //attest
            compareObjects(result, entity.dataValues);

            done();
        });

        it('should not return error if argument is undefined', function(done) {
            //execute
            result = interpreter.toApp(undefined);

            //attest
            compareObjects(result, {});

            done();
        });

        it('should not return error if componentType is not specified', function(done) {
            //prepare
            delete entity.dataValues.componentType;

            //execute
            result = interpreter.toApp(entity);

            //attest
            compareObjects(result, entity.dataValues);

            done();
        });

        it('should interpret app object to db entity', function(done) {
            // execute
            result = interpreter.toDb(entity);

            //attest
            compareObjects(result, entity);

            done();
        });
    });

    describe('complexCommandInterpreter', function(){
        var lookUpTableCommand, lookUpTableComplexCommand;
        beforeEach(function(){
            lookUpTableComplexCommand = {
                id: 'name',
                accountId: 'accountId',
                commands: 'commands',
                created: 'created',
                updated: 'updated'
            };
            lookUpTableCommand = {
                id: 'id',
                complexCommandId: 'complexCommandId',
                componentId: 'componentId',
                transport: 'transport',
                parameters: 'parameters',
                created: 'created',
                updated: 'updated'
            };
            interpreter = postgresInterpreter.complexCommands();
            entity = {
                dataValues: {
                    commands: [
                        {
                            dataValues: {
                                complexCommandId: 'complexCommandId',
                                id: uuid.v4()
                            }
                        }
                    ]
                },
                created: new Date(1234),
                updated: new Date(12345)
            };
            appObject = {
                commands: [{}]
            };
        });

        it('should interpret db entity to app object', function(done) {
            //execute
            result = interpreter.toApp(entity);

            //attest
            compareObjects(result, entity.dataValues);

            done();
        });

        it('should interpret app object to db entity', function(done) {
            //prepare
            result = interpreter.toDb(appObject);

            //attest
            compareObjects(result.commands[0], {});
            expect(result.commands.length).to.equal(1);

            done();
        });

        it('should return users lookUpTable', function(done) {
            // execute
            result = interpreter.lookUp();

            //attest
            compareObjects(result, lookUpTableComplexCommand);

            done();
        });
    });

    describe('rulesInterpreter', function(){
        beforeEach(function(){
            lookUpTable = {
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
            interpreter = postgresInterpreter.rules();
            entity = {
                dataValues: {
                    created: new Date(),
                    updated: new Date(),
                    dataValues: {},
                    deviceAttributes: {},
                    devices: [],
                    deviceTags: [],
                    deviceNames: ['name']
                },
                created: new Date(1234),
                updated: new Date(12345)
            };
            appObject = {
                creationDate: entity.dataValues.created.getTime(),
                lastUpdateDate: entity.dataValues.updated.getTime(),
                dataValues: {},
                population: {
                    attributes: {},
                    ids: [],
                    tags: [],
                    name: ['name']
                }
            };
        });

        it('should interpret db entity to app object', function(done) {
            //execute
            result = interpreter.toApp(entity);

            //attest
            compareObjects(result.dataValues, entity.dataValues.dataValues);

            done();
        });

        it('should not return error if argument is undefined', function(done) {
            //execute
            result = interpreter.toApp(undefined);

            //attest
            compareObjects(result, {});

            done();
        });

        it('should interpret app object to db entity', function(done) {
            // execute
            result = interpreter.toDb(appObject);

            //attest
            compareObjects(result.atributes, entity.dataValues.atributes);
            compareObjects(result.tags, entity.dataValues.tags);

            done();
        });

        it('should interpret app object to db entity if population not exists', function(done) {
            // prepare
            delete appObject.population;
            // execute
            result = interpreter.toDb(appObject);

            // attest
            expect(result.deviceAttributes).to.equal(undefined);
            expect(result.deviceTags).to.equal(undefined);

            done();
        });

        it('should interpret app object to db entity if population is an empty object', function(done) {
            // prepare
            appObject.population = {};
            // execute
            result = interpreter.toDb(appObject);

            // attest
            expect(result.deviceAttributes).to.equal(undefined);
            expect(result.deviceTags).to.equal(undefined);

            done();
        });

        it('should return users lookUpTable', function(done) {
            // execute
            result = interpreter.lookUp();

            //attest
            compareObjects(result, lookUpTable);

            done();
        });
    });

});
