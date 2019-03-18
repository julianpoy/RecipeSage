let environments = {
  development: {
    elastic: {
      enable: true,
      indexPrefix: "rs_dev_",
      connectionString: process.env.RS_DEV_ES_CONN || "http://chefbook:chefbook@localhost:9200"
    }
  },
  test: {
    elastic: {
      enable: false,
      indexPrefix: "rs_test_",
      connectionString: process.env.RS_TEST_ES_CONN || "http://chefbook:chefbook@localhost:9200"
    }
  },
  staging: {
    elastic: {
      enable: false,
      indexPrefix: "rs_stg_",
      connectionString: process.env.RS_STG_ES_CONN || "http://chefbook:chefbook@localhost:9200"
    }
  },
  production: {
    elastic: {
      enable: true,
      indexPrefix: "rs_prod_",
      connectionString: process.env.RS_PROD_ES_CONN || "http://chefbook:chefbook@localhost:9200"
    }
  }
};

module.exports = environments[process.env.NODE_ENV || 'development']
