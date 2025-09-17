export const MealOptionInit = (sequelize, DataTypes) => {
  const MealOption = sequelize.define(
    "MealOption",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mealTime: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "MealOptions",
    },
  );

  MealOption.associate = function (models) {
    MealOption.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return MealOption;
};
