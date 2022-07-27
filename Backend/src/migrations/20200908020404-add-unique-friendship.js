'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('Friendships', {
      type: "UNIQUE",
      name: 'Friendships_userId_friendId_uk',
      fields: ['userId', 'friendId']
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint(
      'Friendships',
      'Friendships_userId_friendId_uk'
    );
  }
};
