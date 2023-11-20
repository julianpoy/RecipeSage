import Sequelize, { Op } from "sequelize";

export const RecipeInit = (sequelize, DataTypes) => {
  const Recipe = sequelize.define("Recipe", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.TEXT,
      defaultValue: "",
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      defaultValue: "",
      allowNull: false,
    },
    rating: {
      type: DataTypes.NUMBER,
      defaultValue: null,
      allowNull: true,
    },
    yield: {
      type: DataTypes.TEXT,
      defaultValue: "",
      allowNull: false,
    },
    activeTime: {
      type: DataTypes.TEXT,
      defaultValue: "",
      allowNull: false,
    },
    totalTime: {
      type: DataTypes.TEXT,
      defaultValue: "",
      allowNull: false,
    },
    source: {
      type: DataTypes.TEXT,
      defaultValue: "",
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT,
      defaultValue: "",
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      defaultValue: "",
      allowNull: false,
    },
    ingredients: {
      type: DataTypes.TEXT,
      defaultValue: "",
      allowNull: false,
    },
    instructions: {
      type: DataTypes.TEXT,
      defaultValue: "",
      allowNull: false,
    },
    folder: {
      type: DataTypes.STRING,
      defaultValue: "main",
      allowNull: false,
    },
    indexedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW,
    },
  });
  Recipe.associate = function (models) {
    Recipe.belongsTo(models.User, {
      foreignKey: {
        name: "userId",
        allowNull: false,
      },
      onDelete: "CASCADE",
    });

    Recipe.belongsTo(models.User, {
      foreignKey: "fromUserId",
      as: "fromUser",
      onDelete: "SET NULL",
    });

    Recipe.belongsToMany(models.Label, {
      foreignKey: "recipeId",
      otherKey: "labelId",
      as: "labels",
      through: models.Recipe_Label,
    });

    Recipe.belongsToMany(models.Label, {
      foreignKey: "recipeId",
      otherKey: "labelId",
      as: "label_filter",
      through: models.Recipe_Label,
    });

    Recipe.hasMany(models.Message, {
      foreignKey: "recipeId",
    });

    Recipe.hasMany(models.Message, {
      foreignKey: "originalRecipeId",
    });

    Recipe.hasMany(models.ShoppingListItem, {
      foreignKey: "recipeId",
    });

    Recipe.hasMany(models.MealPlanItem, {
      foreignKey: "recipeId",
    });

    Recipe.belongsToMany(models.Image, {
      foreignKey: "recipeId",
      otherKey: "imageId",
      as: "images",
      through: models.Recipe_Image,
    });
  };

  Recipe._findTitle = function (userId, recipeId, basename, transaction, ctr) {
    let adjustedTitle;
    if (ctr == 1) {
      adjustedTitle = basename;
    } else {
      adjustedTitle = basename + " (" + ctr + ")";
    }
    return Recipe.findOne({
      where: {
        id: { [Op.ne]: recipeId },
        userId: userId,
        title: adjustedTitle,
      },
      transaction,
    }).then((dupe) => {
      if (dupe) {
        return Recipe._findTitle(
          userId,
          recipeId,
          basename,
          transaction,
          ctr + 1,
        );
      }

      return adjustedTitle;
    });
  };

  Recipe.findTitle = function (userId, recipeId, basename, transaction) {
    return Recipe._findTitle(userId, recipeId, basename, transaction, 1);
  };

  Recipe.share = function (recipeId, recipientId, transaction) {
    return Recipe.findByPk(recipeId, { transaction }).then((recipe) => {
      if (!recipe) {
        const e = new Error("Could not find recipe to share");
        e.status = 404;
        throw e;
      } else {
        return recipe.share(recipientId, transaction);
      }
    });
  };

  Recipe.prototype.share = async function (recipientId, transaction) {
    const adjustedTitle = await Recipe.findTitle(
      recipientId,
      null,
      this.title,
      transaction,
    );

    const recipe = await Recipe.create(
      {
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
        folder: "inbox",
        fromUserId: this.userId,
      },
      {
        transaction,
      },
    );

    const Recipe_Image = require("../models").Recipe_Image;

    const recipeImages = await Recipe_Image.findAll({
      where: {
        recipeId: this.id,
      },
      transaction,
    });

    if (recipeImages.length > 0) {
      await Recipe_Image.bulkCreate(
        recipeImages.map((recipeImage) => ({
          recipeId: recipe.id,
          imageId: recipeImage.imageId,
          order: recipeImage.order,
        })),
        {
          transaction,
        },
      );
    }

    return recipe;
  };

  return Recipe;
};
