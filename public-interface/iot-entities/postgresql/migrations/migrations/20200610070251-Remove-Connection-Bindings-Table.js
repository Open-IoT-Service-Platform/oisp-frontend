'use strict';

module.exports = {
    up: (queryInterface) => {
        return queryInterface.dropTable({
            schema: 'dashboard',
            tableName: 'connectionBindings'
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.createTable('connectionBindings', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4
            },
            deviceUID: {
                type: Sequelize.UUID,
                allowNull: false,
                unique: 'connectionBindings_deviceUID_type_unique'
            },
            lastConnectedAt: {
                type: Sequelize.DATE,
                allowNull: false
            },
            server: {
                type: Sequelize.STRING(50),
                allowNull: false
            },
            connectingStatus: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            type: {
                type: Sequelize.ENUM('mqtt', 'ws'),
                allowNull: false,
                unique: 'connectionBindings_deviceUID_type_unique'
            }
        });
    }
};
