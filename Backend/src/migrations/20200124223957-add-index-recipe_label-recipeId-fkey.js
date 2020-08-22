'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addIndex('Recipe_Labels', ['recipeId']);
  },
  
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeIndex('Recipe_Labels', ['recipeId']);
  }
};
