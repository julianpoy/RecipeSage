export const UserProfileImageInit = (sequelize, DataTypes) => {
  const User_Profile_Image = sequelize.define(
    "User_Profile_Image",
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
  User_Profile_Image.associate = () => {
    // No associations
  };
  return User_Profile_Image;
};
