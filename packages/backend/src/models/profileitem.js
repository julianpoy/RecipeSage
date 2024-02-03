export const ProfileItemInit = (sequelize, DataTypes) => {
  const ProfileItem = sequelize.define(
    "ProfileItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      type: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      visibility: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      order: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
    },
    {},
  );
  ProfileItem.associate = function (models) {
    ProfileItem.belongsTo(models.User, {
      as: "user",
      foreignKey: {
        name: "userId",
        allowNull: false,
      },
      onDelete: "CASCADE",
    });

    ProfileItem.belongsTo(models.Label, {
      as: "label",
      foreignKey: {
        name: "labelId",
        allowNull: true,
      },
      onDelete: "CASCADE",
    });

    ProfileItem.belongsTo(models.Recipe, {
      as: "recipe",
      foreignKey: {
        name: "recipeId",
        allowNull: true,
      },
      onDelete: "CASCADE",
    });
  };
  return ProfileItem;
};
