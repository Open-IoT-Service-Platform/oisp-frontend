'use strict';

module.exports = {
    up: (queryInterface) => {
        return queryInterface.dropTable({
            schema: 'dashboard',
            tableName: 'refresh_tokens'
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.createTable('refresh_tokens', {
            token: {
                type: Sequelize.CHAR(16),
                primaryKey: true
            },
            type: {
                type: Sequelize.ENUM('device', 'user'),
                allowNull: false,
                unique: 'refreshTokens_type_id_unique'
            },
            id: {
                type: Sequelize.UUID,
                allowNull: false,
                unique: 'refreshTokens_type_id_unique'
            },
            expiresAt: {
                type: Sequelize.DATE
            },
            createdAt: {
                type: Sequelize.DATE
            },
            updatedAt: {
                type: Sequelize.DATE
            }
        }, {
            schema: 'dashboard'
        });
    }
};
