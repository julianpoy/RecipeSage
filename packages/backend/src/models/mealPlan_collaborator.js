export const MealPlanCollaboratorInit = (sequelize, DataTypes) => {
  const MealPlanCollaborator = sequelize.define(
    "MealPlan_Collaborator",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
    },
    {
      tableName: "MealPlan_Collaborators",
    },
  );
  MealPlanCollaborator.associate = () => {
    // No associations
  };
  return MealPlanCollaborator;
};
