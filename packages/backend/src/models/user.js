import * as crypto from "crypto";

export const UserInit = (sequelize, DataTypes) => {
  let currentPasswordVersion = 2;

  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: DataTypes.TEXT,
      handle: DataTypes.STRING,
      email: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      passwordHash: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      passwordSalt: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      passwordVersion: {
        type: DataTypes.INTEGER,
        defaultValue: currentPasswordVersion,
        allowNull: false,
      },
      lastLogin: DataTypes.DATE,
      stripeCustomerId: {
        type: DataTypes.STRING,
        unique: true,
      },
      enableProfile: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {},
  );
  User.associate = function (models) {
    User.hasMany(models.Session, {
      foreignKey: "userId",
    });

    User.belongsToMany(models.Image, {
      foreignKey: "userId",
      otherKey: "imageId",
      as: "profileImages",
      through: models.User_Profile_Image,
    });

    User.hasMany(models.FCMToken, {
      foreignKey: "userId",
      as: "fcmTokens",
    });

    User.hasMany(models.Recipe, {
      foreignKey: "userId",
    });

    User.hasMany(models.Label, {
      foreignKey: "userId",
    });

    User.hasMany(models.Message, {
      foreignKey: "toUserId",
      as: "receivedMessages",
    });

    User.hasMany(models.Message, {
      foreignKey: "fromUserId",
      as: "sentMessages",
    });

    User.hasMany(models.ShoppingList, {
      foreignKey: "userId",
      as: "ownedShoppingLists",
    });

    User.hasMany(models.AssistantMessage, {
      foreignKey: "userId",
      as: "assistantMessages",
    });

    User.belongsToMany(models.ShoppingList, {
      foreignKey: "userId",
      otherKey: "shoppingListId",
      as: "collaboratingShoppingLists",
      through: "ShoppingList_Collaborator",
    });

    User.hasMany(models.ShoppingListItem, {
      foreignKey: "userId",
      as: "shoppingListItems",
    });

    User.hasMany(models.MealPlan, {
      foreignKey: "userId",
      as: "mealPlans",
    });

    User.belongsToMany(models.MealPlan, {
      foreignKey: "userId",
      otherKey: "mealPlanId",
      as: "collaboratingMealPlans",
      through: "MealPlan_Collaborator",
    });

    User.hasMany(models.StripePayment, {
      foreignKey: "userId",
    });

    User.hasMany(models.UserSubscription, {
      foreignKey: "userId",
    });
  };

  User.generateHashedPassword = function (password) {
    const salt = crypto.randomBytes(128).toString("base64");
    const hash = crypto
      .pbkdf2Sync(password, salt, 10000, 512, "sha512")
      .toString("base64");

    return {
      hash: hash,
      salt: salt,
      version: currentPasswordVersion,
    };
  };

  User.validateHashedPassword = function (password, hash, salt, version) {
    switch (version) {
      case 1:
      case "1":
        return hash == crypto.pbkdf2Sync(password, salt, 10000, 512, "sha512");
      case 2:
      case "2":
        return (
          hash ==
          crypto
            .pbkdf2Sync(password, salt, 10000, 512, "sha512")
            .toString("base64")
        );
    }

    return false;
  };

  User.login = function (email, password, transaction) {
    // Setup error
    const e = new Error("Credentials are not valid!");
    e.status = 412;

    return User.findOne({
      where: {
        email: email.toLowerCase(),
      },
      transaction,
    }).then((user) => {
      if (!user) {
        throw e;
      } else {
        return user.validatePassword(password, transaction).then((isValid) => {
          if (!isValid) {
            throw e;
          }

          return Promise.resolve(user);
        });
      }
    });
  };

  User.prototype.updatePassword = function (password, transaction) {
    let data = User.generateHashedPassword(password);

    this.passwordHash = data.hash;
    this.passwordSalt = data.salt;
    this.passwordVersion = data.version;

    return this.save({ transaction });
  };

  User.prototype.validatePassword = function (password, transaction) {
    return new Promise((resolve) => {
      let isValid = User.validateHashedPassword(
        password,
        this.passwordHash,
        this.passwordSalt,
        this.passwordVersion,
      );

      // Don't update if password isn't valid, or password is of current version
      if (!isValid || this.passwordVersion == currentPasswordVersion) {
        resolve(isValid);
        return;
      }

      return this.updatePassword(password, transaction).then(() => {
        resolve(isValid);
      });
    });
  };

  return User;
};
