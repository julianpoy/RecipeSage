module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn("Recipes", "indexedAt", {
      type: Sequelize.DATE,
    });
  },

  down: (queryInterface) => {
    return queryInterface.removeColumn("Recipes", "indexedAt");
  },
};
