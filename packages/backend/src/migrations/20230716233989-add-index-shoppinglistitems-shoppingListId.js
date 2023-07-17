module.exports = {
  up: (queryInterface) => {
    return queryInterface.addIndex("ShoppingListItems", ["shoppingListId"]);
  },

  down: (queryInterface) => {
    return queryInterface.removeIndex("ShoppingListItems", ["shoppingListId"]);
  },
};
