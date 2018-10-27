'use strict';
module.exports = (sequelize, DataTypes) => {
  const ShoppingListItem = sequelize.define('ShoppingListItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    title: DataTypes.STRING,
    completed: DataTypes.BOOLEAN
  }, {});
  ShoppingListItem.associate = function(models) {
    ShoppingListItem.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'owner',
      onDelete: 'CASCADE',
    });

    ShoppingListItem.belongsTo(models.ShoppingList, {
      foreignKey: 'shoppingListId',
      as: 'shoppingList',
      onDelete: 'CASCADE',
    });

    ShoppingListItem.belongsTo(models.MealPlanItem, {
      foreignKey: 'mealPlanItemId',
      as: 'mealPlanItem',
      onDelete: 'CASCADE',
    });

    ShoppingListItem.belongsTo(models.Recipe, {
      foreignKey: 'recipeId',
      as: 'recipe',
      onDelete: 'CASCADE',
    });
  };
  return ShoppingListItem;
};
