module.exports = {
  up: (queryInterface) => {
    return queryInterface.addConstraint("Friendships", {
      type: "UNIQUE",
      name: "Friendships_userId_friendId_uk",
      fields: ["userId", "friendId"],
    });
  },

  down: (queryInterface) => {
    return queryInterface.removeConstraint(
      "Friendships",
      "Friendships_userId_friendId_uk",
    );
  },
};
