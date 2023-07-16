module.exports = {
  up: (queryInterface) => {
    return queryInterface.addIndex("Recipe_Images", ["imageId"]);
  },

  down: (queryInterface) => {
    return queryInterface.removeIndex("Recipe_Images", ["imageId"]);
  },
};
