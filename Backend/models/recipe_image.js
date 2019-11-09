'use strict';
module.exports = (sequelize, DataTypes) => {
  const Recipe_Image = sequelize.define('Recipe_Image', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    order: DataTypes.INTEGER
  }, {});
  Recipe_Image.associate = function(models) {};
  return Recipe_Image;
};
