module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(
      "ShoppingList_Collaborators",
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
        },
        shoppingListId: {
          allowNull: false,
          type: Sequelize.UUID,
          references: {
            model: "ShoppingLists",
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
          shoppingList_collaborator: {
            fields: ["shoppingListId", "userId"],
          },
        },
      },
    );
  },
  down: (queryInterface) => {
    return queryInterface.dropTable("ShoppingList_Collaborators");
  },
};
