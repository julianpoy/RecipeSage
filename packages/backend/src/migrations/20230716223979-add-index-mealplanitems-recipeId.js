module.exports = {
  up: (queryInterface) => {
    return queryInterface.addIndex("MealPlanItems", ["recipeId"]);
  },

  down: (queryInterface) => {
    return queryInterface.removeIndex("MealPlanItems", ["recipeId"]);
  },
};
