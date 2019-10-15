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
    return sequelize.define('alerts', {
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
        externalId: {
            type: DataTypes.STRING(40),
            allowNull: false
        },
        deviceUID: {
            type: DataTypes.UUID,
            allowNull: false
        },
        reset: {
            type: DataTypes.DATE,
            allowNull: true
        },
        triggered: {
            type: DataTypes.DATE,
            allowNull: true
        },
        dashboardAlertReceivedOn: {
            type: DataTypes.DATE,
            allowNull: true
        },
        dashboardObservationReceivedOn: {
            type: DataTypes.DATE,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('New', 'Open', 'closed'),
            allowNull: false
        },
        ruleName: {
            type: DataTypes.STRING(255)
        },
        priority: {
            type: DataTypes.ENUM('High', 'Low', 'Medium')
        },
        naturalLangAlert: {
            type: DataTypes.TEXT
        },
        conditions: {
            type: DataTypes.JSON
        },
        resetType: {
            type: DataTypes.ENUM('Automatic', 'Manual')
        }
    },
    {
        createdAt: 'created',
        updatedAt: 'updated',
        indexes: [
            {
                name: 'alerts_accountId_index',
                method: 'BTREE',
                fields: ['accountId']
            },
            {
                name: 'alerts_ruleExternalId_index',
                method: 'BTREE',
                fields: ['externalId']
            },
            {
                name: 'alerts_deviceUID_index',
                method: 'BTREE',
                fields: ['deviceUID']
            },
            {
                name: 'alerts_status_index',
                method: 'BTREE',
                fields: ['status']
            }
        ],
        schema: 'dashboard'
    });
};
