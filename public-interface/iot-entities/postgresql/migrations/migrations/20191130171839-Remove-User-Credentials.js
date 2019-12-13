'use strict';

module.exports = {
    up: (queryInterface) => {
        return queryInterface.removeColumn(
            {
                schema: 'dashboard',
	            tableName: 'users'
            },
	        'password'
        ).then(() => {
            return queryInterface.removeColumn(
                {
                    schema: 'dashboard',
    	            tableName: 'users'
                },
    	        'salt'
            );
        }).then(() => {
            return queryInterface.removeColumn(
                {
                    schema: 'dashboard',
    	            tableName: 'users'
                },
    	        'termsAndConditions'
            );
        }).then(() => {
            return queryInterface.removeColumn(
                {
                    schema: 'dashboard',
    	            tableName: 'users'
                },
    	        'verified'
            );
        }).then(() => {
            return queryInterface.removeColumn(
                {
                    schema: 'dashboard',
    	            tableName: 'users'
                },
    	        'type'
            );
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.addColumn(
            {
                schema: 'dashboard',
                tableName: 'users'
            },
            'password',
            {
                type: Sequelize.STRING(255),
                defaultValue: false,
                allowNull: false
            }
        ).then(() => {
            return queryInterface.addColumn(
                {
                    schema: 'dashboard',
                    tableName: 'users'
                },
                'salt',
                {
                    type: Sequelize.STRING(255),
                    defaultValue: false,
                    allowNull: false
                }
            );
        }).then(() => {
            return queryInterface.addColumn(
                {
                    schema: 'dashboard',
                    tableName: 'users'
                },
                'termsAndConditions',
                {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false,
                    allowNull: false
                }
            );
        }).then(() => {
            return queryInterface.addColumn(
                {
                    schema: 'dashboard',
                    tableName: 'users'
                },
                'verified',
                {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false,
                    allowNull: false
                }
            );
        }).then(() => {
            return queryInterface.addColumn(
                {
                    schema: 'dashboard',
                    tableName: 'users'
                },
                'type',
                {
                    type: Sequelize.ENUM('system', 'user'),
                    defaultValue: 'user',
                    allowNull: false
                }
            );
        });
    }
};
