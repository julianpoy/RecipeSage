'use strict';
module.exports = (sequelize, DataTypes) => {
  const ShoppingList = sequelize.define('ShoppingList', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {});
  ShoppingList.associate = function(models) {
    ShoppingList.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'owner',
      onDelete: 'CASCADE',
    });

    ShoppingList.belongsToMany(models.User, {
      foreignKey: 'shoppingListId',
      otherKey: 'userId',
      as: 'collaborators',
      through: 'ShoppingList_Collaborator'
    });

    ShoppingList.hasMany(models.ShoppingListItem, {
      foreignKey: 'shoppingListId',
      as: 'items'
    });
  };
  return ShoppingList;
};
