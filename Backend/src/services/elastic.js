let elasticsearch = require('@elastic/elasticsearch');

const ENABLE = process.env.ELASTIC_ENABLE === 'true' || process.env.ELASTIC_ENABLE === true;

let client;

if (ENABLE) {
  client = new elasticsearch.Client({
    node: process.env.ELASTIC_CONN
  });
}

const searchRecipes = async (userIds, queryString) => {
  if (!ENABLE) throw new Error('ElasticSearch not enabled');

  return client.search({
    index: 'recipes',
    body: {
      query: {
        bool: {
          should: userIds.map((userId) => ({
            term: {
              userId,
            }
          })),
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
    size: Math.min(userIds.length * 500, 1000)
  });
};

module.exports = {
  searchRecipes
};
