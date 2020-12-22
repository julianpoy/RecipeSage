'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('Friendships', ['userId', 'friendId'], {
      type: "UNIQUE",
      name: 'Friendships_userId_friendId_uk'
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint(
      'Friendships',
      'Friendships_userId_friendId_uk'
    );
  }
};
