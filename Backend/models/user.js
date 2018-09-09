'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    passwordHash: DataTypes.STRING,
    passwordSalt: DataTypes.STRING,
    lastLogin: DataTypes.DATE
  }, {});
  User.associate = function(models) {
    User.hasMany(models.Session, {
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
      as: 'collaboratingShoppingLists',
      through: 'ShoppingList_Collaborators'
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
      as: 'collaboratingMealPlans',
      through: 'MealPlan_Collaborators'
    });
  };
  return User;
};
