'use strict';
module.exports = (sequelize, DataTypes) => {
  const RecipeLabel = sequelize.define('Recipe_Label', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    }
  }, {
    tableName: 'Recipe_Labels'
  });
  RecipeLabel.associate = function (models) {};
  return RecipeLabel;
};
