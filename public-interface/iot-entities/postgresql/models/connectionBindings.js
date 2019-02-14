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

    return sequelize.define('connectionBindings', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        deviceId: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: 'connectionBindings_deviceId_type_unique'
        },
        lastConnectedAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        server: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        connectingStatus: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        type: {
            //Ordering in enum depends on creation date of type, so enum types should be listed in alfabetical order
            type: DataTypes.ENUM('mqtt', 'ws'),
            allowNull: false,
            unique: 'connectionBindings_deviceId_type_unique'
        }
    },
    {
        createdAt: 'created',
        updatedAt: 'updated',
        indexes: [
            {
                name: 'connectionBindings_deviceId_index',
                method: 'BTREE',
                fields: ['deviceId']
            },
            {
                name: 'connectionBindings_type_index',
                method: 'BTREE',
                fields: ['type']
            }
        ],
        schema: 'dashboard'
    });
};