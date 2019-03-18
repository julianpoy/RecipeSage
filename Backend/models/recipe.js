let UtilService = require('../services/util');
let ElasticService = require('../services/elastic');
let cron = require('node-cron');
let Raven = require('raven');
let SQ = require("sequelize");
let Op = SQ.Op;

'use strict';

function afterCommitIfTransaction(options, cb) {
  if (options && options.transaction && options.transaction.afterCommit) {
    options.transaction.afterCommit(cb);
  } else {
    cb();
  }
}

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
    },
    indexedAt: {
      type: DataTypes.DATE,
      defaultValue: SQ.NOW
    }
  }, {
    hooks: {
      beforeDestroy: (recipe, options) => {
        return Recipe.findByPk(recipe.id, {
          attributes: ['image'],
          transaction: options.transaction
        }).then(recipe => {
          if (recipe.image && recipe.image.key) {
            return UtilService.deleteS3Object(recipe.image.key);
          }
        }).then(() => {
          afterCommitIfTransaction(options, () => {
            ElasticService.remove('recipes', recipe.id).catch(e => {
              if (e.status != 404) {
                e = new Error(e);
                e.status = 500;
                throw e;
              }
            }).catch(e => {
              Raven.captureException(e);
            });
          })
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
            afterCommitIfTransaction(options, () => {
              ElasticService.bulk('delete', 'recipes', recipes).catch(e => {
                if (e.status != 404) {
                  e = new Error(e);
                  e.status = 500;
                  throw e;
                }
              }).catch(e => {
                Raven.captureException(e);
              });
            })
          });
        });
      },
      afterUpdate: (recipe, options) => {
        afterCommitIfTransaction(options, () => {
          ElasticService.index('recipes', recipe).catch(e => {
            Raven.captureException(e);
          });
        });
      },
      afterBulkUpdate: options => {
        return Recipe.findAll({
          where: options.where,
          transaction: options.transaction
        }).then(recipes => {
          afterCommitIfTransaction(options, () => {
            ElasticService.bulk('index', 'recipes', recipes).catch(e => {
              Raven.captureException(e);
            });
          });
        });
      },
      afterCreate: (recipe, options) => {
        afterCommitIfTransaction(options, () => {
          ElasticService.index('recipes', recipe).catch(e => {
            Raven.captureException(e);
          });
        })
      },
      afterBulkCreate: (recipes, options) => {
        afterCommitIfTransaction(options, () => {
          ElasticService.bulk('index', 'recipes', recipes).catch(e => {
            Raven.captureException(e);
          });
        });
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

    Recipe.belongsToMany(models.Label, {
      foreignKey: 'recipeId',
      otherKey: 'labelId',
      as: 'label_filter',
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
    return Recipe.findByPk(recipeId, { transaction }).then(recipe => {
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

  cron.schedule('*/1 * * * *', () => {
    let lt = new Date();
    lt.setDate(lt.getDate() - 7);

    Recipe.findAll({
      where: {
        [Op.or]: [
          { indexedAt: null },
          { indexedAt: { [Op.lt]: lt } }
        ]
      },
      limit: 200,
      order: [
        ['indexedAt', 'ASC']
      ]
    }).then(recipes => {
      if (!recipes || recipes.length === 0) return;

      return ElasticService.bulk('index', 'recipes', recipes).then(() => {
        let ids = recipes.map(r => r.id);
        return Recipe.update(
          { indexedAt: new Date() },
          {
            where: {
              id: { [Op.in]: ids }
            },
            silent: true,
            hooks: false
          }
        );
      });
    }).catch(e => {
      Raven.captureException(e);
    });
  });

  return Recipe;
};
