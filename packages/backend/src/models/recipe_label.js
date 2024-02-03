export const RecipeLabelInit = (sequelize, DataTypes) => {
  const RecipeLabel = sequelize.define(
    "Recipe_Label",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
    },
    {
      tableName: "Recipe_Labels",
    },
  );
  RecipeLabel.associate = () => {
    // No associations
  };
  return RecipeLabel;
};
