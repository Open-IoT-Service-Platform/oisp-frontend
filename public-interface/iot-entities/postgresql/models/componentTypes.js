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

module.exports = function (sequelize, DataTypes) {

    return sequelize.define('componentTypes', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: DataTypes.UUIDV4
        },
        componentTypeId: {
            type: DataTypes.STRING(385),
            allowNull: false,
            unique: 'componentTypeId_accountId_unique'
        },
        accountId: {
            type: DataTypes.UUID,
            allowNull: true,
            unique: 'componentTypeId_accountId_unique'
        },
        dimension: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        default: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        display: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        format: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        measureunit: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        version: {
            type: DataTypes.STRING(128),
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('actuator', 'sensor'),
            allowNull: false
        },
        dataType: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        command: {
            type: DataTypes.JSON
        },
        icon: {
            type: DataTypes.STRING(50)
        },
        min : {
            type: DataTypes.DECIMAL,
            allowNull: true
        },
        max : {
            type: DataTypes.DECIMAL,
            allowNull: true
        }
    },
    {
        createdAt: 'created',
        updatedAt: 'updated',
        indexes: [
            {
                name: 'componentTypes_accountId_index',
                method: 'BTREE',
                fields: ['accountId']
            }
        ],
        schema: 'dashboard'
    }
    );
};

