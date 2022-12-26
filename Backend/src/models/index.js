'use strict';

const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const basename = path.basename(__filename);
let config = require('../config/sequelize-config.js')[process.env.NODE_ENV];
const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, config);

db.modelNames = [];

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js') && (file.indexOf('.spec.') === -1);
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
    db.modelNames.push(model.name);
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

const authPromise = sequelize.authenticate();

if (process.env.NODE_ENV !== 'test') {
  authPromise.then(() => {
    console.log('Database connection established');
  }).catch((error) => {
    console.error('Unable to connect to the database:', error);
  });
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
