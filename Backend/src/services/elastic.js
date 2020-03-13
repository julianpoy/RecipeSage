let elasticsearch = require('@elastic/elasticsearch');

const ENABLE = process.env.ELASTIC_ENABLE === 'true' || process.env.ELASTIC_ENABLE === true;
const INDEX_PREFIX = process.env.ELASTIC_IDX_PREFIX;

const getFullIndexName = index => INDEX_PREFIX + index;

let client;

const init = async () => {
  try {
    await client.ping();

    const recipesIdxExistsCall = await client.indices.exists({
      index: getFullIndexName('recipes')
    });

    if (!recipesIdxExistsCall.body) {
      await client.indices.create({
        index: getFullIndexName('recipes'),
        body: {
          mappings: {
            properties: {
              title: {
                type: 'text',
                analyzer: "english", // Enable stemming
                fields: {
                  keyword: {
                    type: 'keyword',
                    ignore_above: 256
                  }
                }
              }
            }
          }
        }
      });
    }

    console.log("Elastic initialized");
  } catch (e) {
    setTimeout(init, 100);
  }
};

if (ENABLE) {
  client = new elasticsearch.Client({
    node: process.env.ELASTIC_CONN
  });

  init();
}

const indexRecipes = recipes => {
  if (!ENABLE) return Promise.resolve();

  const actions = recipes.reduce((acc, recipe) => {
    if (recipe.toJSON) recipe = recipe.toJSON();

    const { userId, title, source, description, ingredients, instructions, notes } = recipe;

    const action = {
      index: {
        _index: getFullIndexName('recipes'),
        _id: recipe.id
      }
    };

    const document = {
      userId,
      title,
      source,
      description,
      ingredients,
      instructions,
      notes
    };

    return [...acc, action, document];
  }, []);

  if (actions.length === 0) return Promise.resolve();

  return client.bulk({
    body: actions
  });
};

const deleteRecipes = recipeIds => {
  if (!ENABLE) return Promise.resolve();

  const actions = recipeIds.map(recipeId => ({
    delete: {
      _index: getFullIndexName('recipes'),
      _id: recipeId
    }
  }));

  if (actions.length === 0) return Promise.resolve();

  return client.bulk({
    body: actions
  });
};

const searchRecipes = (userId, queryString) => {
  if (!ENABLE) throw new Error("ElasticSearch not enabled");

  return client.search({
    index: getFullIndexName('recipes'),
    body: {
      query: {
        bool: {
          filter: {
            query_string: {
              fields: ["userId"],
              analyzer: "standard",
              query: userId
            }
          },
          must: {
            multi_match: {
              query: queryString,
              fuzziness: "AUTO",
              fields: [
                "title^1.5",
                "source^1.2",
                "description^1.2",
                "ingredients",
                "instructions",
                "notes"
              ]
            }
          }
        }
      }
    },
    size: 100
  });
};

module.exports = {
  indexRecipes,
  deleteRecipes,
  searchRecipes
};
