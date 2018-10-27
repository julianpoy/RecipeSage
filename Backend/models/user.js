var crypto = require('crypto');

'use strict';

module.exports = (sequelize, DataTypes) => {
  let currentPasswordVersion = 2;

  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    passwordSalt: {
      type: DataTypes.STRING,
      allowNull: false
    },
    passwordVersion: {
      type: DataTypes.INTEGER,
      defaultValue: currentPasswordVersion,
      allowNull: false
    },
    lastLogin: DataTypes.DATE
  }, {});
  User.associate = function(models) {
    User.hasMany(models.Session, {
      foreignKey: 'userId'
    });

    User.hasMany(models.FCMToken, {
      foreignKey: 'userId'
    });

    User.hasMany(models.Recipe, {
      foreignKey: 'userId'
    });

    User.hasMany(models.Label, {
      foreignKey: 'userId'
    });

    User.hasMany(models.Message, {
      foreignKey: 'toUserId',
      as: 'receivedMessages'
    });

    User.hasMany(models.Message, {
      foreignKey: 'fromUserId',
      as: 'sentMessages'
    });

    User.hasMany(models.ShoppingList, {
      foreignKey: 'userId',
      as: 'ownedShoppingLists'
    });

    User.belongsToMany(models.ShoppingList, {
      foreignKey: 'userId',
      otherKey: 'shoppingListId',
      as: 'collaboratingShoppingLists',
      through: 'ShoppingList_Collaborator'
    });

    User.hasMany(models.ShoppingListItem, {
      foreignKey: 'userId',
      as: 'shoppingListItems'
    });

    User.hasMany(models.MealPlan, {
      foreignKey: 'userId',
      as: 'mealPlans'
    });

    User.belongsToMany(models.MealPlan, {
      foreignKey: 'userId',
      otherKey: 'mealPlanId',
      as: 'collaboratingMealPlans',
      through: 'MealPlan_Collaborator'
    });
  };

  User.generateHashedPassword = function (password, cb) {
    var salt = crypto.randomBytes(128).toString('base64');
    var hash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('base64');

    cb({
      hash: hash,
      salt: salt,
      version: currentPasswordVersion
    });
  };

  User.validateHashedPassword = function (password, hash, salt, version, cb) {
    switch (version) {
      case 1:
      case '1':
        var comp = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512');
        cb(comp == hash);
        break;
      case 2:
      case '2':
        var comp = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512').toString('base64');
        cb(comp == hash);
        break;
      default:
        cb(false);
    }
  };

  User.login = function (email, password, cb) {
    User.find({
      where: {
        email: email.toLowerCase()
      }
    }).exec(function (err, user) {
      if (!user) {
        cb();
      } else {
        user.validatePassword(password, function (err, valid) {
          if (err) {
            cb(err);
          } else if (!valid) {
            cb();
          } else {

          }
        });
      }
    }).catch(cb);
  }

  User.prototype.updatePassword = function (password, cb) {
    var me = this;
    User.generateHashedPassword(password, function (data) {
      me.passwordHash = data.hash;
      me.passwordSalt = data.salt;
      me.passwordVersion = data.version;

      me.save().then(function() {
        cb();
      }).catch(function(err) {
        cb(err);
      });
    });
  }

  User.prototype.validatePassword = function (password, cb) {
    var me = this;
    User.validateHashedPassword(password, this.passwordHash, this.passwordSalt, this.passwordVersion, function (passwordIsValid) {
      // Don't update if password isn't valid, or password is of current version
      if (!passwordIsValid || me.passwordVersion == currentPasswordVersion) {
        cb(null, passwordIsValid);
        return;
      }

      User.prototype.updatePassword.call(me, password, function() {
        cb(passwordIsValid);
      });
    });
  };

  return User;
};
