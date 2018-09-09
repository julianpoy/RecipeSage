const uuid = require('uuid/v4');

'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Recipes', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: uuid()
      },
      userId: {
        allowNull: false,
        type: Sequelize.UUID,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.STRING
      },
      yield: {
        type: Sequelize.STRING
      },
      activeTime: {
        type: Sequelize.STRING
      },
      totalTime: {
        type: Sequelize.STRING
      },
      source: {
        type: Sequelize.STRING
      },
      url: {
        type: Sequelize.STRING
      },
      notes: {
        type: Sequelize.STRING
      },
      ingredients: {
        type: Sequelize.STRING
      },
      instructions: {
        type: Sequelize.STRING
      },
      image: {
        type: Sequelize.JSONB
      },
      folder: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Recipes');
  }
};
