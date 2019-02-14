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
var settingTypes = ['global', 'dashboard', 'favorite'];
module.exports = function (sequelize, DataTypes) {

    return sequelize.define('settings', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM(settingTypes),
            allowNull: false,
            validate: {
                isIn: [settingTypes]
            }
        },
        accountId: {
            type: DataTypes.UUID
        },
        public: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        default: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        name: {
            type: DataTypes.STRING(255)
        },
        value: {
            type: DataTypes.JSON,
            allowNull: false
        }

    }, {
        createdAt: 'created',
        updatedAt: 'updated',
        indexes: [
            {
                name: 'settings_user_index',
                method: 'BTREE',
                fields: ['userId']
            },
            {
                name: 'settings_account_index',
                method: 'BTREE',
                fields: ['accountId']
            }
        ],
        schema: 'dashboard'
    }
    );
};
