let elasticsearch = require('@elastic/elasticsearch');

const ENABLE = process.env.ELASTIC_ENABLE === 'true' || process.env.ELASTIC_ENABLE === true;

let client;

if (ENABLE) {
  client = new elasticsearch.Client({
    node: process.env.ELASTIC_CONN
  });
}

const searchRecipes = async (userId, queryString) => {
  if (!ENABLE) throw new Error('ElasticSearch not enabled');

  return client.search({
    index: 'recipes',
    body: {
      query: {
        bool: {
          filter: {
            query_string: {
              fields: ['userId'],
              analyzer: 'standard',
              query: userId
            }
          },
          must: {
            multi_match: {
              query: queryString,
              fuzziness: 'AUTO',
              fields: [
                'title^1.5',
                'source^1.2',
                'description^1.2',
                'ingredients',
                'instructions',
                'notes'
              ],
              type: 'most_fields',
              operator: 'and'
            }
          }
        }
      }
    },
    size: 500
  });
};

module.exports = {
  searchRecipes
};
