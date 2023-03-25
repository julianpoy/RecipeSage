'use strict';

module.exports = {
  up: (queryInterface) => {
    return queryInterface.addIndex('Recipe_Labels', ['recipeId']);
  },

  down: (queryInterface) => {
    return queryInterface.removeIndex('Recipe_Labels', ['recipeId']);
  }
};
