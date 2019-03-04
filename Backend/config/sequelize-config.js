module.exports = {
  "development": {
    "username": process.env.RS_DEV_DB_USERNAME || "chefbook",
    "password": process.env.RS_DEV_DB_PASSWORD || "admin",
    "database": process.env.RS_DEV_DB_DATABASE || "chefbook",
    "host"    : process.env.RS_DEV_DB_HOST     || "127.0.0.1",
    "ssl"     : process.env.RS_DEV_DB_SSL == "true",
    "dialect": "postgres",
    "dialectOptions": {
      "ssl": process.env.RS_DEV_DB_SSL == "true"
    },
    "operatorsAliases": false
  },
  "test": {
    "dialect": "sqlite",
    "storage": "test.sqlite3",
    "logging": false,
    "operatorsAliases": false
  },
  "staging": {
    "username": process.env.RS_STG_DB_USERNAME || "chefbook",
    "password": process.env.RS_STG_DB_PASSWORD || null,
    "database": process.env.RS_STG_DB_DATABASE || "chefbook",
    "host"    : process.env.RS_STG_DB_HOST     || "127.0.0.1",
    "ssl": process.env.RS_STG_DB_SSL == "true",
    "dialect": "postgres",
    "dialectOptions": {
      "ssl": process.env.RS_STG_DB_SSL == "true"
    },
    "operatorsAliases": false
  },
  "production": {
    "username": process.env.RS_PROD_DB_USERNAME || "chefbook",
    "password": process.env.RS_PROD_DB_PASSWORD || null,
    "database": process.env.RS_PROD_DB_DATABASE || "chefbook",
    "host"    : process.env.RS_PROD_DB_HOST     || "127.0.0.1",
    "ssl": process.env.RS_PROD_DB_SSL == "true",
    "dialect": "postgres",
    "dialectOptions": {
      "ssl": process.env.RS_PROD_DB_SSL == "true"
    },
    "operatorsAliases": false
  }
}
