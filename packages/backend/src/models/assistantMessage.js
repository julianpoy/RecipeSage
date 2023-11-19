export const AssistantMessageInit = (sequelize, DataTypes) => {
  const AssistantMessage = sequelize.define(
    "AssistantMessage",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      data: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {},
  );
  AssistantMessage.associate = function (models) {
    AssistantMessage.belongsTo(models.User, {
      foreignKey: {
        name: "userId",
        allowNull: false,
      },
      as: "user",
      onDelete: "CASCADE",
    });
  };
  return AssistantMessage;
};
