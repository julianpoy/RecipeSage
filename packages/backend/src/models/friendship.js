export const FriendshipInit = (sequelize, DataTypes) => {
  const Friendship = sequelize.define(
    "Friendship",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
    },
    {},
  );
  Friendship.associate = function (models) {
    Friendship.belongsTo(models.User, {
      foreignKey: {
        name: "userId",
        allowNull: false,
      },
      as: "user",
      onDelete: "CASCADE",
    });

    Friendship.belongsTo(models.User, {
      foreignKey: {
        name: "friendId",
        allowNull: false,
      },
      as: "friend",
      onDelete: "CASCADE",
    });
  };

  Friendship.areUsersFriends = async function (userId, friendId) {
    const outgoingFriendship = await Friendship.findOne({
      where: {
        userId,
        friendId,
      },
    });

    const incomingFriendship = await Friendship.findOne({
      where: {
        userId: friendId,
        friendId: userId, // Reverse relationship
      },
    });

    return outgoingFriendship && incomingFriendship;
  };

  return Friendship;
};
