'use strict';
module.exports = (sequelize, DataTypes) => {
  const Recipe = sequelize.define('Recipe', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      defaultValue: '',
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      defaultValue: '',
      allowNull: false
    },
    yield: {
      type: DataTypes.STRING,
      defaultValue: '',
      allowNull: false
    },
    activeTime: {
      type: DataTypes.STRING,
      defaultValue: '',
      allowNull: false
    },
    totalTime: {
      type: DataTypes.STRING,
      defaultValue: '',
      allowNull: false
    },
    source: {
      type: DataTypes.STRING,
      defaultValue: '',
      allowNull: false
    },
    url: {
      type: DataTypes.STRING,
      defaultValue: '',
      allowNull: false
    },
    notes: {
      type: DataTypes.STRING,
      defaultValue: '',
      allowNull: false
    },
    ingredients: {
      type: DataTypes.STRING,
      defaultValue: '',
      allowNull: false
    },
    instructions: {
      type: DataTypes.STRING,
      defaultValue: '',
      allowNull: false
    },
    image: DataTypes.JSONB,
    folder: {
      type: DataTypes.STRING,
      defaultValue: 'main',
      allowNull: false
    }
  }, {});
  Recipe.associate = function(models) {
    Recipe.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        allowNull: false
      },
      onDelete: 'CASCADE',
    });

    Recipe.belongsTo(models.User, {
      foreignKey: 'fromUserId',
      as: 'fromUser',
      onDelete: 'SET NULL',
    });

    Recipe.belongsToMany(models.Label, {
      foreignKey: 'recipeId',
      otherKey: 'labelId',
      as: 'labels',
      through: models.Recipe_Label
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
