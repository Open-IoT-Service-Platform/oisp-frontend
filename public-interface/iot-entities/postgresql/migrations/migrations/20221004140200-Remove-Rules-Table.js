'use strict';

module.exports = {
    up: (queryInterface) => {
        return queryInterface.dropTable({
            schema: 'dashboard',
            tableName: 'rules'
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.createTable('rules', {
            id: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: Sequelize.UUIDV4
            },
            externalId: {
                type: Sequelize.STRING(40),
                unique: true,
                allowNull: false
            },
            accountId: {
                type: Sequelize.UUID,
                allowNull: false
            },
            status: {
                type: Sequelize.ENUM('Active', 'Archived', 'Draft', 'Deleted', 'On-hold'),
                allowNull: false
            },
            name: {
                type: Sequelize.STRING(255)
            },
            owner: {
                type: Sequelize.STRING(255)
            },
            naturalLanguage:{
                type: Sequelize.TEXT
            },
            conditions: {
                type: Sequelize.JSON
            },
            actions: {
                type: Sequelize.JSON
            },
            deviceNames: {
                type: Sequelize.ARRAY(Sequelize.STRING(255))
            },
            deviceTags : {
                type: Sequelize.ARRAY(Sequelize.STRING(255))
            },
            devices :{
                type: Sequelize.ARRAY(Sequelize.STRING(255))
            },
            deviceAttributes :{
                type: Sequelize.JSON
            },
            priority: {
                type: Sequelize.ENUM('High', 'Low', 'Medium')
            },
            resetType: {
                type: Sequelize.ENUM('Automatic', 'Manual')
            },
            type: {
                type: Sequelize.STRING(50)
            },
            description: {
                type: Sequelize.TEXT
            },
            synchronizationStatus: {
                type: Sequelize.ENUM('NotSync','Sync'),
                default: 'NotSync'
            }
        }, {
            createdAt: 'created',
            updatedAt: 'updated',
            indexes: [
                {
                    name: 'rules_accountId_index',
                    method: 'BTREE',
                    fields: ['accountId']
                },
                {
                    name: 'rules_status_index',
                    method: 'BTREE',
                    fields: ['status', 'synchronizationStatus']
                }
            ],
            schema: 'dashboard'
        });
    }
};
