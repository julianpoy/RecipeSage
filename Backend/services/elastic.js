let elasticsearch = require('elasticsearch');

var { connectionString, indexPrefix } = require('../config/environment.js').elastic;

let client = new elasticsearch.Client({
  hosts: [connectionString]
});

let index = (index, document) => {
  if (document.toJSON) document = document.toJSON();

  return client.index({
    index: indexPrefix + index,
    type: index,
    id: document.id,
    body: document
  });
};

let remove = (index, docId) => {
  return client.delete({
    index: indexPrefix + index,
    type: index,
    id: docId
  });
};

let bulk = (action, index, documents) => {
  let query = documents.reduce((acc, document) => {
    acc.push({
      [action]: {
        _index: indexPrefix + index,
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
  return client.search({
    index: indexPrefix + index,
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
              fields: ["title"]
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
