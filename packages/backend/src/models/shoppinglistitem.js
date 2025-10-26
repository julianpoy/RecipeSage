export const ShoppingListItemInit = (sequelize, DataTypes) => {
  const ShoppingListItem = sequelize.define(
    "ShoppingListItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {},
  );
  ShoppingListItem.associate = function (models) {
    ShoppingListItem.belongsTo(models.User, {
      foreignKey: {
        name: "userId",
        allowNull: false,
      },
      as: "owner",
      onDelete: "CASCADE",
    });

    ShoppingListItem.belongsTo(models.ShoppingList, {
      foreignKey: {
        name: "shoppingListId",
        allowNull: false,
      },
      as: "shoppingList",
      onDelete: "CASCADE",
    });

    ShoppingListItem.belongsTo(models.MealPlanItem, {
      foreignKey: "mealPlanItemId",
      as: "mealPlanItem",
      onDelete: "CASCADE",
    });

    ShoppingListItem.belongsTo(models.Recipe, {
      foreignKey: "recipeId",
      as: "recipe",
      onDelete: "CASCADE",
    });
  };
  return ShoppingListItem;
};
