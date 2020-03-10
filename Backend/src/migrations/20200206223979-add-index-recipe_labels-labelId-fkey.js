'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addIndex('Recipe_Labels', ['labelId']);
  },
  
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeIndex('Recipe_Labels', ['labelId']);
  }
};
