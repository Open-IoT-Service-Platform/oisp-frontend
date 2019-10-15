'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.addColumn(
            {
                schema: 'dashboard',
	            tableName: 'alerts'
            },
	        'suppressed',
            {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            }
        );
    },
    down: (queryInterface) => {
        return queryInterface.removeColumn(
            {
                schema: 'dashboard',
                tableName: 'alerts'
            },
            'suppressed'
        );
    }
};
