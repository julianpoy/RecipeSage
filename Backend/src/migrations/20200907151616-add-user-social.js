'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'Users',
      'enableProfile',
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      }
    );

    await queryInterface.addColumn(
      'Users',
      'profileVisibility',
      {
        type: Sequelize.TEXT,
        defaultValue: null
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      'Users',
      'enableProfile'
    );

    await queryInterface.removeColumn(
      'Users',
      'profileVisibility'
    );
  }
};
