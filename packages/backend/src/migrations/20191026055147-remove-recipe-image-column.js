const UUID = require("uuid");

module.exports = {
  up: (queryInterface) => {
    const sequelize = queryInterface.sequelize;

    return sequelize.transaction(async (transaction) => {
      const [recipes] = await sequelize.query(
        'SELECT id, "userId", image FROM "Recipes" WHERE image IS NOT NULL',
        {
          transaction,
        },
      );

      if (recipes.length) {
        // Avoid generating emtpy SQL
        const now = new Date();

        const images = await queryInterface.bulkInsert(
          "Images",
          recipes.map((recipe) => ({
            id: UUID.v4(),
            userId: recipe.userId,
            location: recipe.image.location,
            key: recipe.image.key,
            json: JSON.stringify(recipe.image),
            createdAt: now,
            updatedAt: now,
          })),
          {
            transaction,
            returning: true,
          },
        );

        await queryInterface.bulkInsert(
          "Recipe_Images",
          images.map((image, idx) => ({
            id: UUID.v4(),
            recipeId: recipes[idx].id,
            imageId: image.id,
            order: 0,
            createdAt: now,
            updatedAt: now,
          })),
          {
            transaction,
          },
        );
      }

      await queryInterface.removeColumn("Recipes", "image", {
        transaction,
      });
    });
  },

  down: (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;

    return sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn("Recipes", "image", {
        type: Sequelize.JSON,
        transaction,
      });

      const [recipeImages] = await sequelize.query(
        'SELECT "recipeId", "json" FROM "Recipe_Images" INNER JOIN "Images" on "Images".id = "Recipe_Images"."imageId" WHERE "Recipe_Images"."order" = 0',
        {
          transaction,
        },
      );

      if (recipeImages.length) {
        // Avoid generating emtpy SQL
        await Promise.all(
          recipeImages.map(async (recipeImage) => {
            queryInterface.bulkUpdate(
              "Recipes",
              {
                image: recipeImage.json, // Vals
              },
              {
                id: recipeImage.recipeId, // Where
              },
              {
                transaction,
              },
            );
          }),
        );
      }

      await sequelize.query('DELETE FROM "Recipe_Images" WHERE true', {
        transaction,
      });

      await sequelize.query('DELETE FROM "Images" WHERE true', {
        transaction,
      });
    });
  },
};
