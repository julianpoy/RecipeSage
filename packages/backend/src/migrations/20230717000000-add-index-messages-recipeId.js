module.exports = {
  up: (queryInterface) => {
    return queryInterface.addIndex("Messages", ["recipeId"]);
  },

  down: (queryInterface) => {
    return queryInterface.removeIndex("Messages", ["recipeId"]);
  },
};
