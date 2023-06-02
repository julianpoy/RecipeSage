

export default {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'Users',
      'handle',
      {
        type: Sequelize.STRING
      }
    );
  },

  down: (queryInterface) => {
    return queryInterface.removeColumn(
      'Users',
      'handle'
    );
  }
};
