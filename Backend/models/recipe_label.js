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
    tableName: 'Recipe_Labels',
    hooks: {
      afterDestroy: (recipeLabel, options) => {
        console.log("got called", recipeLabel)
        recipeLabel.getLabel().then(function(label) {
          console.log("got my label!", label);
        });
      },
      afterBulkDestroy: (where, individualHooks) => {
        console.log("got called 2", where, individualHooks)
        // recipeLabel.getLabel().then(function (label) {
        //   console.log("got my label!", label);
        // });
      }
    }
  });
  RecipeLabel.associate = function (models) {};
  return RecipeLabel;
};
