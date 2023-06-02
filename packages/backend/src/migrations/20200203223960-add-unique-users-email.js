

export default {
  up: (queryInterface) => {
    return queryInterface.addConstraint('Users', {
      type: 'UNIQUE',
      name: 'Users_email_uk',
      fields: ['email']
    });
  },

  down: (queryInterface) => {
    return queryInterface.removeConstraint('Users', 'Users_email_uk');
  }
};
