'use strict';
module.exports = (sequelize, DataTypes) => {
  const Label = sequelize.define('Label', {
    title: DataTypes.STRING
  }, {});
  Label.associate = function(models) {
    Label.belongsTo(models.User, {
      foreignKey: 'userId',
      onDelete: 'CASCADE',
    });

    Label.belongsToMany(models.Label, {
      foreignKey: 'labelId',
      as: 'recipes',
      through: 'Recipe_Labels'
    });
  };
  return Label;
};
