const config = {
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  port: process.env.POSTGRES_PORT,
  host: process.env.POSTGRES_HOST,
  ssl: process.env.POSTGRES_SSL == 'true',
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.POSTGRES_SSL == 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false,
  },
  logging: process.env.POSTGRES_LOGGING == 'true' && console.log
};

module.exports = {
  development: config,
  selfhost: config,
  test: config,
  staging: config,
  production: config
};
