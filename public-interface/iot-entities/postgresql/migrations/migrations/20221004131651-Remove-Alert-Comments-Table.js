'use strict';

module.exports = {
    up: (queryInterface) => {
        return queryInterface.dropTable({
            schema: 'dashboard',
            tableName: 'alert_comments'
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.createTable('alert_comments', {
            text: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            user: {
                type: Sequelize.STRING(255),
                allowNull: false
            }
        }, {
            createdAt: 'created',
            updatedAt: 'updated',
            indexes: [
                {
                    name: 'alert_comments_alertId',
                    method: 'BTREE',
                    fields: ['alertId']
                }
            ],
            schema: 'dashboard'
        });
    }
};
