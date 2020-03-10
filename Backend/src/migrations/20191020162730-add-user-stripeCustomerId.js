'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'Users',
      'stripeCustomerId',
      {
        type: Sequelize.STRING,
        unique: true
      }
    );
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn(
      'Users',
      'stripeCustomerId'
    );
  }
};
