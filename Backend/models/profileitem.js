'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProfileItem = sequelize.define('ProfileItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    title: DataTypes.STRING,
    type: DataTypes.STRING,
    visibility: DataTypes.STRING,
    order: DataTypes.INTEGER
  }, {});
  ProfileItem.associate = function(models) {
    ProfileItem.belongsTo(models.User, {
      foreignKey: {
        name: 'userId',
        allowNull: false
      },
      onDelete: 'CASCADE',
    });

    ProfileItem.belongsTo(models.Label, {
      foreignKey: {
        name: 'labelId',
        allowNull: true
      },
      onDelete: 'CASCADE',
    });

    ProfileItem.belongsTo(models.Recipe, {
      foreignKey: {
        name: 'recipeId',
        allowNull: true
      },
      onDelete: 'CASCADE',
    });
  };
  return ProfileItem;
};
