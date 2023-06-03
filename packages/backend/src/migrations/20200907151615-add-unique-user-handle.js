export default {
  up: (queryInterface) => {
    return queryInterface.addConstraint("Users", {
      type: "UNIQUE",
      name: "Users_handle_uk",
      fields: ["handle"],
    });
  },

  down: (queryInterface) => {
    return queryInterface.removeConstraint("Users", "Users_handle_uk");
  },
};
