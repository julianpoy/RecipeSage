'use strict';
module.exports = (sequelize, DataTypes) => {
  const Recipe = sequelize.define('Recipe', {
    title: DataTypes.STRING,
    description: DataTypes.STRING,
    yield: DataTypes.STRING,
    activeTime: DataTypes.STRING,
    totalTime: DataTypes.STRING,
    source: DataTypes.STRING,
    url: DataTypes.STRING,
    notes: DataTypes.STRING,
    ingredients: DataTypes.STRING,
    instructions: DataTypes.STRING,
    image: DataTypes.JSONB,
    folder: DataTypes.STRING
  }, {});
  Recipe.associate = function(models) {
    Recipe.belongsTo(models.User, {
      foreignKey: 'userId',
      onDelete: 'CASCADE',
    });

    Recipe.belongsToMany(models.Label, {
      foreignKey: 'recipeId',
      as: 'labels',
      through: 'Recipe_Labels'
    });

    Recipe.hasMany(models.Message, {
      foreignKey: 'recipeId',
    });

    Recipe.hasMany(models.Message, {
      foreignKey: 'originalRecipeId',
    });

    Recipe.hasMany(models.ShoppingListItem, {
      foreignKey: 'recipeId',
    });

    Recipe.hasMany(models.MealPlanItem, {
      foreignKey: 'recipeId',
    });
  };
  return Recipe;
};
