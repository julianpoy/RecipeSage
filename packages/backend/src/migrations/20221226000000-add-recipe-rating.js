

export default {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Recipes', 'rating', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  down: (queryInterface) => {
    return queryInterface.removeColumn('Recipes', 'rating');
  }
};
