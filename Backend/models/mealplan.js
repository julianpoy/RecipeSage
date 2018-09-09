'use strict';
module.exports = (sequelize, DataTypes) => {
  const MealPlan = sequelize.define('MealPlan', {
    title: DataTypes.STRING
  }, {});
  MealPlan.associate = function(models) {
    MealPlan.belongsTo(models.User, {
      foreignKey: 'userId',
      onDelete: 'CASCADE',
    });

    MealPlan.belongsToMany(models.User, {
      foreignKey: 'mealPlanId',
      as: 'collaborators',
      through: 'MealPlan_Collaborators',
    });

    MealPlan.hasMany(models.MealPlanItem, {
      foreignKey: 'mealPlanId',
      as: 'items'
    });
  };
  return MealPlan;
};
