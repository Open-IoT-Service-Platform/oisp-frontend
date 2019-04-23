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
    return sequelize.define('rules', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: DataTypes.UUIDV4
        },
        //For active rules externalId is an integer received from AA, for draft it was hash - 40's character length
        //In postgres we will use uuid for drafts
        externalId: {
            type: DataTypes.STRING(40),
            unique: true,
            allowNull: false
        },
        accountId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('Active', 'Archived', 'Draft', 'On-hold', 'Deleted'),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(255)
        },
        owner: {
            type: DataTypes.STRING(255)
        },
        naturalLanguage:{
            type: DataTypes.TEXT
        },
        conditions: {
            type: DataTypes.JSON
        },
        actions: {
            type: DataTypes.JSON
        },
        deviceNames: {
            type: DataTypes.ARRAY(DataTypes.STRING(255))
        },
        deviceTags : {
            type: DataTypes.ARRAY(DataTypes.STRING(255))
        },
        devices :{
            type: DataTypes.ARRAY(DataTypes.STRING(255))
        },
        deviceAttributes :{
            type: DataTypes.JSON
        },
        priority: {
            type: DataTypes.ENUM('High', 'Low', 'Medium')
        },
        resetType: {
            type: DataTypes.ENUM('Automatic', 'Manual')
        },
        type: {
            type: DataTypes.STRING(50)
        },
        description: {
            type: DataTypes.TEXT
        },
        synchronizationStatus: {
            type: DataTypes.ENUM('NotSync','Sync')
        }
    },
    {
        createdAt: 'created',
        updatedAt: 'updated',
        indexes: [
            {
                name: 'rules_accountId_index',
                method: 'BTREE',
                fields: ['accountId']
            }
        ],
        schema: 'dashboard'
    });
};
