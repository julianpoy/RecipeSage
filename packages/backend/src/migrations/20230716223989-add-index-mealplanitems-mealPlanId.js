module.exports = {
  up: (queryInterface) => {
    return queryInterface.addIndex("MealPlanItems", ["mealPlanId"]);
  },

  down: (queryInterface) => {
    return queryInterface.removeIndex("MealPlanItems", ["mealPlanId"]);
  },
};
