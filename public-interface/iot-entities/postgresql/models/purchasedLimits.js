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
    return sequelize.define('purchased_limits', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: DataTypes.UUIDV4
        },
        accountId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        route:{
            type: DataTypes.STRING(255),
            allowNull: false
        },
        limit:{
            type: DataTypes.BIGINT,
            allowNull: false
        },
        method:{
            type: DataTypes.STRING(10),
            allowNull: false
        }

    },
    {
        createdAt: 'created',
        updatedAt: 'updated',
        indexes: [
            {
                name: 'purchased_limits_accountId_index',
                method: 'BTREE',
                fields: ['accountId']
            }
        ],
        schema: 'dashboard'
    });
};
