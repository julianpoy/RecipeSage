export const FCMTokenInit = (sequelize, DataTypes) => {
  const FCMToken = sequelize.define(
    "FCMToken",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      token: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {},
  );
  FCMToken.associate = function (models) {
    FCMToken.belongsTo(models.User, {
      foreignKey: {
        name: "userId",
        allowNull: false,
      },
      onDelete: "CASCADE",
    });
  };
  return FCMToken;
};
