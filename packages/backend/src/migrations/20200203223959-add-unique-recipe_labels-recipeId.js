module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Delete all duplicate label->recipe relationships
      await queryInterface.sequelize.query(
        `
        DELETE FROM "Recipe_Labels" rl
        WHERE id IN
          (SELECT id FROM
            (SELECT id,
            ROW_NUMBER() OVER( PARTITION BY "labelId", "recipeId"
            ORDER BY id ) AS row_num
            FROM "Recipe_Labels" ) t
            WHERE t.row_num > 1 );
      `,
        {
          transaction,
        },
      );

      await queryInterface.addConstraint("Recipe_Labels", {
        type: "UNIQUE",
        name: "Recipe_Labels_labelId_recipeId_uk",
        fields: ["labelId", "recipeId"],
        transaction,
      });
    });
  },

  down: (queryInterface) => {
    return queryInterface.removeConstraint(
      "Recipe_Labels",
      "Recipe_Labels_labelId_recipeId_uk",
    );
  },
};
