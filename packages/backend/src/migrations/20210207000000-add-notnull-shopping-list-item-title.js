

export default {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('ShoppingListItems', 'title', {
      type: Sequelize.TEXT,
      allowNull: false
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('ShoppingListItems', 'title', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  }
};
