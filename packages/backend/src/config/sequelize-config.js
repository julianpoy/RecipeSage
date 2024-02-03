if (
  !process.env.POSTGRES_USER ||
  !process.env.POSTGRES_PASSWORD ||
  !process.env.POSTGRES_DB ||
  !process.env.POSTGRES_HOST ||
  !process.env.POSTGRES_PORT
) {
  throw new Error(
    "Must provide POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_HOST, POSTGRES_PORT",
  );
}

const config = {
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  port: process.env.POSTGRES_PORT,
  host: process.env.POSTGRES_HOST,
  ssl: process.env.POSTGRES_SSL == "true",
  dialect: "postgres",
  dialectOptions: {
    ssl:
      process.env.POSTGRES_SSL == "true"
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : false,
  },
  logging:
    !process.env.JEST_WORKER_ID &&
    process.env.POSTGRES_LOGGING === "true" &&
    console.log,
};

// Must be commonjs for sequelize-cli
module.exports = {
  development: config,
  selfhost: config,
  test: config,
  staging: config,
  production: config,
};
