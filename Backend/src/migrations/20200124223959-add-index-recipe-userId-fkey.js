'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addIndex('Recipes', ['userId']);
  },
  
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeIndex('Recipes', ['userId']);
  }
};
