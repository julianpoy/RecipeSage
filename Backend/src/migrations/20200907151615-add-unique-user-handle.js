'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('Users', {
      type: "UNIQUE",
      name: 'Users_handle_uk',
      fields: ['handle']
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint(
      'Users',
      'Users_handle_uk'
    );
  }
};
