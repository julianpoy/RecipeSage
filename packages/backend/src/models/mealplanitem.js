export const MealPlanItemInit = (sequelize, DataTypes) => {
  const MealPlanItem = sequelize.define(
    "MealPlanItem",
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
      scheduled: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      meal: {
        type: DataTypes.STRING,
        defaultValue: "other",
        allowNull: false,
      },
    },
    {},
  );
  MealPlanItem.associate = function (models) {
    MealPlanItem.belongsTo(models.User, {
      foreignKey: {
        name: "userId",
        allowNull: false,
      },
      as: "owner",
      onDelete: "CASCADE",
    });

    MealPlanItem.hasMany(models.ShoppingListItem, {
      foreignKey: "mealPlanItemId",
      as: "shoppingListItems",
      onDelete: "SET NULL",
    });

    MealPlanItem.belongsTo(models.MealPlan, {
      foreignKey: {
        name: "mealPlanId",
        allowNull: false,
      },
      as: "mealPlan",
      onDelete: "CASCADE",
    });

    MealPlanItem.belongsTo(models.Recipe, {
      foreignKey: "recipeId",
      as: "recipe",
      onDelete: "CASCADE",
    });
  };
  return MealPlanItem;
};
