export const RecipeImageInit = (sequelize, DataTypes) => {
  const Recipe_Image = sequelize.define(
    "Recipe_Image",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      order: DataTypes.INTEGER,
    },
    {},
  );
  Recipe_Image.associate = () => {
    // No associations
  };
  return Recipe_Image;
};
