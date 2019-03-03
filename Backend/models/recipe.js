let UtilService = require('../services/util')

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
      type: DataTypes.TEXT,
      defaultValue: '',
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: '',
      allowNull: false
    },
    yield: {
      type: DataTypes.TEXT,
      defaultValue: '',
      allowNull: false
    },
    activeTime: {
      type: DataTypes.TEXT,
      defaultValue: '',
      allowNull: false
    },
    totalTime: {
      type: DataTypes.TEXT,
      defaultValue: '',
      allowNull: false
    },
    source: {
      type: DataTypes.TEXT,
      defaultValue: '',
      allowNull: false
    },
    url: {
      type: DataTypes.TEXT,
      defaultValue: '',
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      defaultValue: '',
      allowNull: false
    },
    ingredients: {
      type: DataTypes.TEXT,
      defaultValue: '',
      allowNull: false
    },
    instructions: {
      type: DataTypes.TEXT,
      defaultValue: '',
      allowNull: false
    },
    image: DataTypes.JSONB,
    folder: {
      type: DataTypes.STRING,
      defaultValue: 'main',
      allowNull: false
    }
  }, {
    hooks: {
      beforeDestroy: (recipe, options) => {
        return Recipe.findById(recipe.id, {
          attributes: ['image'],
          transaction: options.transaction
        }).then(recipe => {
          if (recipe.image && recipe.image.key) {
            return UtilService.deleteS3Object(recipe.image.key);
          }
        })
      },
      beforeBulkDestroy: (where, options) => {
        return Recipe.findAll({
          where,
          attributes: ['image'],
          transaction: options.transaction
        }).then(recipes => {
          return Promise.all(recipes.map(recipe => {
            if (recipe.image && recipe.image.key) {
              return UtilService.deleteS3Object(recipe.image.key);
            }
          }))
        })
      }
    }
  });
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
