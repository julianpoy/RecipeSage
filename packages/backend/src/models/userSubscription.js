export const UserSubscriptionInit = (sequelize, DataTypes) => {
  const UserSubscription = sequelize.define(
    "UserSubscription",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      expires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {},
  );
  UserSubscription.associate = function (models) {
    UserSubscription.belongsTo(models.User, {
      foreignKey: {
        name: "userId",
        allowNull: false,
      },
      onDelete: "CASCADE",
    });
  };
  return UserSubscription;
};
