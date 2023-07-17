module.exports = {
  up: (queryInterface) => {
    return queryInterface.addIndex("Images", ["userId"]);
  },

  down: (queryInterface) => {
    return queryInterface.removeIndex("Images", ["userId"]);
  },
};
