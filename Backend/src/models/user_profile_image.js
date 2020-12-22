'use strict';
module.exports = (sequelize, DataTypes) => {
  const User_Profile_Image = sequelize.define('User_Profile_Image', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    order: DataTypes.INTEGER
  }, {});
  User_Profile_Image.associate = function(models) {};
  return User_Profile_Image;
};
