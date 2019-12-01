'use strict';
module.exports = (sequelize, DataTypes) => {
  const Friendship = sequelize.define('Friendship', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    }
  }, {});
  Friendship.associate = function(models) {
    Friendship.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        allowNull: false
      },
      onDelete: 'CASCADE',
    });

    Friendship.belongsTo(models.User, {
      foreignKey: {
        name: 'friendId',
        allowNull: false
      },
      onDelete: 'CASCADE',
    });
  };
  return Friendship;
};
