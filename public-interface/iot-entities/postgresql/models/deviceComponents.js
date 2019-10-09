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

    return sequelize.define('device_components', {
        componentId: {
            type: DataTypes.STRING(255),
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: 'device_components_deviceUID_name_unique'
        },
        componentTypeId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        deviceUID: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: 'device_components_deviceUID_name_unique'
        },
        last_observation_time: {
            type: DataTypes.DATE
        },
        last_export_date: {
            type: DataTypes.DATE
        }
    },
    {
        createdAt: 'created',
        updatedAt: 'updated',
        indexes: [
            {
                name: 'device_components_deviceUID_index',
                method: 'BTREE',
                fields: ['deviceUID']
            },
            {
                name: 'device_components_componentTypeId_index',
                method: 'BTREE',
                fields: ['componentTypeId']
            }
        ],
        schema: 'dashboard'
    });
};
