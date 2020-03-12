let ElasticService = require('./services/elastic');
let cron = require('node-cron');
let Raven = require('raven');
let SQ = require("sequelize");
let Op = SQ.Op;

var Recipe = require('./models').Recipe;

let runInterval;

const runIndexOp = async () => {
  try {
    let lt = new Date();
    lt.setDate(lt.getDate() - 7);

    if (process.env.INDEX_BEFORE) {
      lt = new Date(process.env.INDEX_BEFORE); // Must be in '2020-03-01 22:20' format
    }

    const recipes = await Recipe.findAll({
      where: {
        [Op.or]: [
          { indexedAt: null },
          { indexedAt: { [Op.lt]: lt } }
        ]
      },
      limit: 250
    });

    if (!recipes || recipes.length === 0) {
      clearInterval(runInterval);
      console.log("Index complete!");
      process.exit(0);
      return;
    };

    await ElasticService.bulk('index', 'recipes', recipes);

    let ids = recipes.map(r => r.id);
    await Recipe.update(
      { indexedAt: new Date() },
      {
        where: {
          id: ids
        },
        silent: true,
        hooks: false
      }
    );
  } catch(e) {
    clearInterval(runInterval);
    Raven.captureException(e);
    console.log("Error while indexing", e);
    process.exit(1);
  }
};

runInterval = setInterval(runIndexOp, 1000);

process.on('SIGTERM', () => {
  console.log("RECEIVED SIGTERM - STOPPING JOB");
  server.close(() => {
    console.log("JOB STOPPED - RESTING");
    setTimeout(() => {
      console.log("EXITING");
      process.exit(0);
    }, 15 * 1000);
  });
});

