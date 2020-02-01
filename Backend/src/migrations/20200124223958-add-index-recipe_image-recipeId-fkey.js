'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addIndex('Recipe_Images', ['recipeId']);
  },
  
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeIndex('Recipe_Images', ['recipeId']);
  }
};
