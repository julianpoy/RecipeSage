module.exports = {
  up: (queryInterface) => {
    return queryInterface.addIndex("ShoppingListItems", ["recipeId"]);
  },

  down: (queryInterface) => {
    return queryInterface.removeIndex("ShoppingListItems", ["recipeId"]);
  },
};
