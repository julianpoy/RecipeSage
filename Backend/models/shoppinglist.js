'use strict';
module.exports = (sequelize, DataTypes) => {
  const ShoppingList = sequelize.define('ShoppingList', {
    title: DataTypes.STRING
  }, {});
  ShoppingList.associate = function(models) {
    ShoppingList.belongsTo(models.User, {
      foreignKey: 'userId',
      onDelete: 'CASCADE',
    });

    ShoppingList.belongsToMany(models.User, {
      foreignKey: 'shoppingListId',
      as: 'collaborators',
      through: 'ShoppingList_Collaborators'
    });

    ShoppingList.hasMany(models.ShoppingListItem, {
      foreignKey: 'shoppingListId',
      as: 'items'
    });
  };
  return ShoppingList;
};
