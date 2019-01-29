module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [
    {
      name      : 'RecipeSageAPI',
      script    : 'bin/www',
      instances : "2",
      instance_var: "INSTANCE_ID",
      env: {
        NODE_ENV: 'production',
        PORT: '3030'
      }
    },
    {
      name      : 'RecipeSageStagingAPI',
      script    : 'bin/www',
      instances : "2",
      instance_var: "INSTANCE_ID",
      env: {
        NODE_ENV: 'staging',
        PORT: '3040'
      }
    }
  ]
};
