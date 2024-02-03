module.exports = {
  up: (queryInterface) => {
    return queryInterface.addIndex("Messages", ["originalRecipeId"]);
  },

  down: (queryInterface) => {
    return queryInterface.removeIndex("Messages", ["originalRecipeId"]);
  },
};
