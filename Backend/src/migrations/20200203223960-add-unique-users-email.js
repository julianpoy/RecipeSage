'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('Users', {
      type: "UNIQUE",
      name: 'Users_email_uk',
      fields: ['email']
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint('Users', 'Users_email_uk');
  }
};
