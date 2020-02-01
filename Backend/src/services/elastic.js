let elasticsearch = require('elasticsearch');

const ENABLE = process.env.ELASTIC_ENABLE === 'true' || process.env.ELASTIC_ENABLE === true;
const INDEX_PREFIX = process.env.ELASTIC_IDX_PREFIX;

const AVAILABLE_INDEXES = [
  'recipes'
];

let client;

const init = async () => {
  try {
    await client.ping();

    await Promise.all(AVAILABLE_INDEXES.map(index => {
      return client.indices.create({
        index: INDEX_PREFIX + index
      });
    }));
  } catch (e) {
    setTimeout(init, 100);
  }
};

if (ENABLE) {
  client = new elasticsearch.Client({
    hosts: [process.env.ELASTIC_CONN]
  });

  init();
}

let index = (index, document) => {
  if (!ENABLE) return Promise.resolve();

  if (document.toJSON) document = document.toJSON();

  return client.index({
    index: INDEX_PREFIX + index,
    type: index,
    id: document.id,
    body: document
  });
};

let remove = (index, docId) => {
  if (!ENABLE) return Promise.resolve();

  return client.delete({
    index: INDEX_PREFIX + index,
    type: index,
    id: docId
  });
};

let bulk = (action, index, documents) => {
  if (!ENABLE) return Promise.resolve();

  let query = documents.reduce((acc, document) => {
    acc.push({
      [action]: {
        _index: INDEX_PREFIX + index,
        _type: index,
        _id: document.id
      }
    });

    if (action !== 'delete') {
      if (document.toJSON) document = document.toJSON();
      acc.push(document);
    }

    return acc;
  }, [])

  return client.bulk({
    body: query
  });
};

let search = (index, userId, queryString) => {
  if (!ENABLE) throw new Error("ElasticSearch not enabled");

  return client.search({
    index: INDEX_PREFIX + index,
    type: index,
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
  index,
  remove,
  bulk,
  search
};
