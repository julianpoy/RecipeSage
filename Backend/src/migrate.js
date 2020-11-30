const Sequelize = require('sequelize');
const Umzug = require('umzug');
const path = require('path');

let config = require('./config/sequelize-config.js')[process.env.NODE_ENV];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const umzug = new Umzug({
  migrations: {
    // indicates the folder containing the migration .js files
    path: path.join(__dirname, 'migrations'),
    pattern: /.*\.js$/,
    // inject sequelize's QueryInterface in the migrations
    params: [
      sequelize.getQueryInterface(),
      Sequelize,
    ]
  },
  // indicates that the migration data should be store in the database
  // itself through sequelize. The default configuration creates a table
  // named `SequelizeMeta`.
  storage: 'sequelize',
  storageOptions: {
    sequelize
  },
  logger: console,
});

(async () => {
  // Checks migrations and run them if they are not already applied
  await umzug.up()
  console.log('All migrations performed successfully')
})();
