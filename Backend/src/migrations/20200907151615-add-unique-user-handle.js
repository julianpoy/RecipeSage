'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('Users', ['handle'], {
      type: "UNIQUE",
      name: 'Users_handle_uk'
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint(
      'Users',
      'Users_handle_uk'
    );
  }
};
