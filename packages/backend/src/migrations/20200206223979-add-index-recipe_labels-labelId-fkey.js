export default {
  up: (queryInterface) => {
    return queryInterface.addIndex("Recipe_Labels", ["labelId"]);
  },

  down: (queryInterface) => {
    return queryInterface.removeIndex("Recipe_Labels", ["labelId"]);
  },
};
