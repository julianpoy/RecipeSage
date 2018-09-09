'use strict';
module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    type: DataTypes.STRING,
    token: DataTypes.STRING,
    expires: DataTypes.DATE
  }, {});
  Session.associate = function(models) {
    Session.belongsTo(models.User, {
      foreignKey: 'userId',
      onDelete: 'CASCADE',
    });
  };
  return Session;
};
