module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(
      "Recipe_Labels",
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
        },
        recipeId: {
          allowNull: false,
          type: Sequelize.UUID,
          references: {
            model: "Recipes",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        labelId: {
          allowNull: false,
          type: Sequelize.UUID,
          references: {
            model: "Labels",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      },
      {
        uniqueKeys: {
          recipe_label: {
            fields: ["recipeId", "labelId"],
          },
        },
      },
    );
  },
  down: (queryInterface) => {
    return queryInterface.dropTable("Recipe_Labels");
  },
};
