

export default {
  up: (queryInterface) => {
    return queryInterface.addIndex('Recipes', ['userId']);
  },

  down: (queryInterface) => {
    return queryInterface.removeIndex('Recipes', ['userId']);
  }
};
