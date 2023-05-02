'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('ShoppingListItems', 'completed', {
      type: Sequelize.BOOLEAN,
      allowNull: false
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn('ShoppingListItems', 'completed', {
      type: Sequelize.BOOLEAN,
      allowNull: true
    });
  }
};
