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

    return sequelize.define('users', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: DataTypes.UUIDV4
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        salt: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        termsAndConditions: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        provider: {
            type: DataTypes.STRING(255)
        },
        //in sequelize 'attributes' name is restricted, so we have to use attr instead here
        attrs: {
            type: DataTypes.JSON
        },
        type: {
            type: DataTypes.ENUM('system', 'user'),
            allowNull: false,
            defaultValue: 'user'
        }
    }, {
        createdAt: 'created',
        updatedAt: 'updated',
        schema: 'dashboard'
    }
    );
};
