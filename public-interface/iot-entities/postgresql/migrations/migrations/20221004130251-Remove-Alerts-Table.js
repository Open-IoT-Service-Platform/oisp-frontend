'use strict';

module.exports = {
    up: (queryInterface) => {
        return queryInterface.dropTable({
            schema: 'dashboard',
            tableName: 'alerts'
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.createTable('alerts', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: Sequelize.UUIDV4
            },
            accountId: {
                type: Sequelize.UUID,
                allowNull: false
            },
            externalId: {
                type: Sequelize.STRING(40),
                allowNull: false
            },
            deviceUID: {
                type: Sequelize.UUID,
                allowNull: false
            },
            reset: {
                type: Sequelize.DATE,
                allowNull: true
            },
            triggered: {
                type: Sequelize.DATE,
                allowNull: true
            },
            dashboardAlertReceivedOn: {
                type: Sequelize.DATE,
                allowNull: true
            },
            dashboardObservationReceivedOn: {
                type: Sequelize.DATE,
                allowNull: true
            },
            status: {
                type: Sequelize.ENUM('New', 'Open', 'closed'),
                allowNull: false
            },
            ruleName: {
                type: Sequelize.STRING(255)
            },
            priority: {
                type: Sequelize.ENUM('High', 'Low', 'Medium')
            },
            naturalLangAlert: {
                type: Sequelize.TEXT
            },
            conditions: {
                type: Sequelize.JSON
            },
            resetType: {
                type: Sequelize.ENUM('Automatic', 'Manual')
            },
            suppressed: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            }
        }, {
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
    }
};
