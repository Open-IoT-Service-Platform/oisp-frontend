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

    return sequelize.define('user_interaction_tokens', {
        id: {
            type: DataTypes.CHAR(16),
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: 'userId_type_unique'
        },
        type: {
            type: DataTypes.ENUM('activate-user', 'password-reset'),
            allowNull: false,
            unique: 'userId_type_unique'
        },
        expiresAt: {
            type: DataTypes.DATE
        }
    }, {
        createdAt: 'created',
        updatedAt: 'updated',
        schema: 'dashboard'
    }
    );
};
