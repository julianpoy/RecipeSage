'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
let config = require(__dirname + '/../config/sequelize-config.js')[process.env.NODE_ENV];
const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, config);

db.modelNames = [];

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js') && (file.indexOf('.spec.') === -1);
  })
  .forEach(file => {
    const model = sequelize['import'](path.join(__dirname, file));
    db[model.name] = model;
    db.modelNames.push(model.name);
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
