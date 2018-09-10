'use strict';
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    body: DataTypes.STRING
  }, {});
  Message.associate = function(models) {
    Message.belongsTo(models.User, {
      foreignKey: 'fromUserId',
      onDelete: 'CASCADE',
    });

    Message.belongsTo(models.User, {
      foreignKey: 'toUserId',
      onDelete: 'CASCADE',
    });

    Message.belongsTo(models.Recipe, {
      foreignKey: 'recipeId',
      onDelete: 'SET NULL',
    });

    Message.belongsTo(models.Recipe, {
      foreignKey: 'originalRecipeId',
      onDelete: 'SET NULL',
    });
  };
  return Message;
};
