let ElasticService = require('./services/elastic');
let cron = require('node-cron');
let Raven = require('raven');
let SQ = require("sequelize");
let Op = SQ.Op;

var Recipe = require('./models').Recipe;

cron.schedule('*/1 * * * *', () => {
  let lt = new Date();
  lt.setDate(lt.getDate() - 7);

  Recipe.findAll({
    where: {
      [Op.or]: [
        { indexedAt: null },
        { indexedAt: { [Op.lt]: lt } }
      ]
    },
    limit: 1000,
    order: [
      ['indexedAt', 'ASC']
    ]
  }).then(recipes => {
    if (!recipes || recipes.length === 0) return;

    return ElasticService.bulk('index', 'recipes', recipes).then(() => {
      let ids = recipes.map(r => r.id);
      return Recipe.update(
        { indexedAt: new Date() },
        {
          where: {
            id: { [Op.in]: ids }
          },
          silent: true,
          hooks: false
        }
      );
    });
  }).catch(e => {
    Raven.captureException(e);
  });
});
