export const ShoppingListCollaboratorInit = (sequelize, DataTypes) => {
  const ShoppingListCollaborator = sequelize.define(
    "ShoppingList_Collaborator",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
    },
    {
      tableName: "ShoppingList_Collaborators",
    },
  );
  ShoppingListCollaborator.associate = () => {
    // No associations
  };
  return ShoppingListCollaborator;
};
