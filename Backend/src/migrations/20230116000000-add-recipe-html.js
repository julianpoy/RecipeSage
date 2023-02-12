'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn('Recipes', 'notesHtml', {
        type: Sequelize.TEXT,
        defaultValue: '',
        allowNull: false,
      }, {
        transaction,
      });

      await queryInterface.addColumn('Recipes', 'ingredientsHtml', {
        type: Sequelize.TEXT,
        defaultValue: '',
        allowNull: false,
      }, {
        transaction,
      });

      await queryInterface.addColumn('Recipes', 'instructionsHtml', {
        type: Sequelize.TEXT,
        defaultValue: '',
        allowNull: false,
      }, {
        transaction,
      });
    });
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('Recipes', 'notesHtml', {
        transaction
      });

      await queryInterface.removeColumn('Recipes', 'ingredientsHtml', {
        transaction
      });

      await queryInterface.removeColumn('Recipes', 'instructionsHtml', {
        transaction
      });
    });
  }
};
