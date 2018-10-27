'use strict';
module.exports = (sequelize, DataTypes) => {
  const MealPlanItem = sequelize.define('MealPlanItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    title: DataTypes.STRING,
    scheduled: DataTypes.DATE,
    meal: DataTypes.STRING
  }, {});
  MealPlanItem.associate = function(models) {
    MealPlanItem.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'owner',
      onDelete: 'CASCADE',
    });

    MealPlanItem.hasMany(models.ShoppingListItem, {
      foreignKey: 'mealPlanItemId',
      as: 'shoppingListItems',
      onDelete: 'SET NULL'
    });

    MealPlanItem.belongsTo(models.MealPlan, {
      foreignKey: 'mealPlanId',
      as: 'mealPlan',
      onDelete: 'CASCADE',
    });

    MealPlanItem.belongsTo(models.Recipe, {
      foreignKey: 'recipeId',
      as: 'recipe',
      onDelete: 'CASCADE',
    });
  };
  return MealPlanItem;
};
