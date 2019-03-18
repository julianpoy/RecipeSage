let UtilService = require('../services/util');
let ElasticService = require('../services/elastic');
let cron = require('node-cron');
let Raven = require('raven');
let Op = require("sequelize").Op;

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
        }).then(() => {
          return ElasticService.remove('recipes', recipe.id).catch(e => {
            if (e.status != 404) {
              e = new Error(e);
              e.status = 500;
              throw e;
            }
          });
        });
      },
      beforeBulkDestroy: (options) => {
        return Recipe.findAll({
          where: options.where,
          attributes: ['id', 'image'],
          transaction: options.transaction
        }).then(recipes => {
          return Promise.all(recipes.map(recipe => {
            if (recipe.image && recipe.image.key) {
              return UtilService.deleteS3Object(recipe.image.key);
            }
          })).then(() => {
            return ElasticService.bulk('delete', 'recipes', recipes);
          });
        });
      },
      afterUpdate: (recipe, options) => {
        return ElasticService.index('recipes', recipe);
      },
      afterBulkUpdate: options => {
        return Recipe.findAll({
          where: options.where,
          transaction: options.transaction
        }).then(recipes => {
          return ElasticService.bulk('index', 'recipes', recipes);
        });
      },
      afterCreate: (recipe, options) => {
        return ElasticService.index('recipes', recipe);
      },
      afterBulkCreate: (recipes, options) => {
        return ElasticService.bulk('index', 'recipes', recipes);
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

  Recipe._findTitle = function(userId, recipeId, basename, transaction, ctr) {
    var adjustedTitle;
    if (ctr == 1) {
      adjustedTitle = basename;
    } else {
      adjustedTitle = basename + ' (' + ctr + ')';
    }
    return Recipe.findOne({
      where: {
        id: { [Op.ne]: recipeId },
        userId: userId,
        title: adjustedTitle
      },
      transaction
    }).then(dupe => {
      if (dupe) {
        return Recipe._findTitle(userId, recipeId, basename, transaction, ctr + 1);
      }

      return adjustedTitle
    });
  }

  Recipe.findTitle = function(userId, recipeId, basename, transaction) {
    return Recipe._findTitle(userId, recipeId, basename, transaction, 1);
  }

  Recipe.share = function(recipeId, recipientId, transaction) {
    return Recipe.findById(recipeId, { transaction }).then(recipe => {
      if (!recipe) {
        var e = new Error("Could not find recipe to share");
        e.status = 404;
        throw e;
      } else {
        return recipe.share(recipientId, transaction);
      }
    });
  }

  Recipe.prototype.share = function(recipientId, transaction) {
    return new Promise((resolve, reject) => {
      if (this.image && this.image.location) {
        UtilService.sendURLToS3(this.image.location).then(resolve).catch(reject)
      } else {
        resolve(null);
      }
    }).then(img => {
      return Recipe.findTitle(recipientId, null, this.title, transaction).then(adjustedTitle => {
        return Recipe.create({
          userId: recipientId,
          title: adjustedTitle,
          description: this.description,
          yield: this.yield,
          activeTime: this.activeTime,
          totalTime: this.totalTime,
          source: this.source,
          url: this.url,
          notes: this.notes,
          ingredients: this.ingredients,
          instructions: this.instructions,
          image: img,
          folder: 'inbox',
          fromUserId: this.userId
        }, {
          transaction
        });
      });
    });
  }

  cron.schedule('*/2 * * * *', () => {
    Recipe.count().then(count => {
      return Recipe.findAll({
        offset: Math.floor(Math.random() * count),
        limit: 200
      }).then(recipes => {
        return ElasticService.bulk('index', 'recipes', recipes);
      });
    }).catch(e => {
      Raven.captureException(e);
    });
  });

  return Recipe;
};
