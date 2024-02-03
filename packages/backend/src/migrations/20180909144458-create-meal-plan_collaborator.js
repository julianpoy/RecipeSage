module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(
      "MealPlan_Collaborators",
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
        },
        mealPlanId: {
          allowNull: false,
          type: Sequelize.UUID,
          references: {
            model: "MealPlans",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        userId: {
          allowNull: false,
          type: Sequelize.UUID,
          references: {
            model: "Users",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      },
      {
        uniqueKeys: {
          mealPlan_collaborator: {
            fields: ["mealPlanId", "userId"],
          },
        },
      },
    );
  },
  down: (queryInterface) => {
    return queryInterface.dropTable("MealPlan_Collaborators");
  },
};
