const Sequelize = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const path = require('path');
const { program } = require('commander');

let config = require('./config/sequelize-config.js')[process.env.NODE_ENV];

program
  .arguments('[direction] [count]')
  .parse(process.argv);

const options = {
  direction: program.args.at(0) || 'up',
  count: program.args.at(1),
};

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, 'migrations/*.js'),
    resolve: ({ name, path, context }) => {
      const migration = require(path);
      return {
        name,
        up: async () => migration.up(context, Sequelize),
        down: async () => migration.down(context, Sequelize),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

(async () => {
  if (options.direction === 'up') {
    await umzug.up({
      step: options.count || undefined,
    });
  } else {
    await umzug.down({
      step: options.count || undefined,
      to: options.count ? undefined : 0,
    });
  }
  console.log('All migrations performed successfully');
  process.exit(0);
})();
