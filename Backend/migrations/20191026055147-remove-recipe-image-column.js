'use strict';

const UUID = require('uuid');

module.exports = {
  up: (queryInterface, Sequelize) => {
    var sequelize = queryInterface.sequelize;

    return sequelize.transaction(async t => {
      const [recipes] = await sequelize.query('SELECT id, "userId", image FROM "Recipes" WHERE image IS NOT NULL', {
        transaction: t
      });

      const now = new Date();

      const images = await queryInterface.bulkInsert('Images', recipes.map(recipe => ({
        id: UUID.v4(),
        userId: recipe.userId,
        location: recipe.image.location,
        key: recipe.image.key,
        json: JSON.stringify(recipe.image),
        createdAt: now,
        updatedAt: now
      })), {
        transaction: t,
        returning: true
      });

      await queryInterface.bulkInsert('Recipe_Images', images.map((image, idx) => ({
        id: UUID.v4(),
        recipeId: recipes[idx].id,
        imageId: image.id,
        order: 0,
        createdAt: now,
        updatedAt: now
      })), {
        transaction: t
      });
    });
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
  }
};
