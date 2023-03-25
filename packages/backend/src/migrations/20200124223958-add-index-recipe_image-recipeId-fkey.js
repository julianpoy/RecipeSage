'use strict';

module.exports = {
  up: (queryInterface) => {
    return queryInterface.addIndex('Recipe_Images', ['recipeId']);
  },

  down: (queryInterface) => {
    return queryInterface.removeIndex('Recipe_Images', ['recipeId']);
  }
};
