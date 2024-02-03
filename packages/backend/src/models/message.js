export const MessageInit = (sequelize, DataTypes) => {
  const Message = sequelize.define(
    "Message",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        defaultValue: "",
        allowNull: false,
      },
    },
    {},
  );
  Message.associate = function (models) {
    Message.belongsTo(models.User, {
      foreignKey: {
        name: "fromUserId",
        allowNull: false,
      },
      as: "fromUser",
      onDelete: "CASCADE",
    });

    Message.belongsTo(models.User, {
      foreignKey: {
        name: "toUserId",
        allowNull: false,
      },
      as: "toUser",
      onDelete: "CASCADE",
    });

    Message.belongsTo(models.Recipe, {
      foreignKey: "recipeId",
      as: "recipe",
      onDelete: "SET NULL",
    });

    Message.belongsTo(models.Recipe, {
      foreignKey: "originalRecipeId",
      as: "originalRecipe",
      onDelete: "SET NULL",
    });
  };
  return Message;
};
