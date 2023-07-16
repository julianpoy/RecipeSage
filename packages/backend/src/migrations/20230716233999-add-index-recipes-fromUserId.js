module.exports = {
  up: (queryInterface) => {
    return queryInterface.addIndex("Recipes", ["fromUserId"]);
  },

  down: (queryInterface) => {
    return queryInterface.removeIndex("Recipes", ["fromUserId"]);
  },
};
