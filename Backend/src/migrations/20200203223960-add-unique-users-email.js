'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('Users', ['email'], {
      type: "UNIQUE",
      name: 'Users_email_uk'
    });
  },
  
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint('Users', 'Users_email_uk');
  }
};
