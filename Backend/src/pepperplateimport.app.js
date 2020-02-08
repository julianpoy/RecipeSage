const Raven = require('raven');

const UtilService = require('./services/util');

const MAX_JOB_COUNT = 1;

const fs = require('fs');

let puppeteer = require('puppeteer');

// DB
var Op = require("sequelize").Op;
var SQ = require('./models').sequelize;
var User = require('./models').User;
var Recipe = require('./models').Recipe;
var FCMToken = require('./models').FCMToken;
var Label = require('./models').Label;
var Recipe_Label = require('./models').Recipe_Label;
var Image = require('./models').Image;
var Recipe_Image = require('./models').Recipe_Image;

var RS_VERSION = JSON.parse(fs.readFileSync('./package.json')).version;

Raven.config(process.env.SENTRY_DSN, {
  environment: process.env.NODE_ENV,
  release: RS_VERSION
}).install();

function saveRecipes(userId, recipes) {
  return SQ.transaction(async t => {

    const PEPPERPLATE_IMG_CHUNK_SIZE = 50;

    await UtilService.executeInChunks(recipes.map(recipe => () => {
      if (recipe.imageURL) {
        return UtilService.sendURLToS3(recipe.imageURL).then(image => {
          recipe.image = image;
        }).catch(() => {});
      }
    }), PEPPERPLATE_IMG_CHUNK_SIZE);

    const serializedRecipes = recipes.map(recipe => ({
      userId: userId,
      title: recipe.title,
      description: recipe.description,
      yield: recipe.yield,
      activeTime: recipe.activeTime,
      totalTime: recipe.totalTime,
      source: recipe.source,
      url: recipe.url,
      notes: recipe.notes,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions
    }));

    const savedRecipes = await Recipe.bulkCreate(serializedRecipes, {
      returning: true,
      transaction: t
    });

    const pendingImageData = [];
    const recipesByLabelTitle = {};
    savedRecipes.map((savedRecipe, idx) => {
      if (recipes[idx].image) {
        pendingImageData.push({
          image: recipes[idx].image,
          recipeId: savedRecipe.id,
          order: 0 // Pepperplate only supports one image
        });
      }

      recipes[idx].rawCategories.map(rawCategory => {
        const labelTitle = rawCategory.trim().toLowerCase();
        recipesByLabelTitle[labelTitle] = recipesByLabelTitle[labelTitle] || [];
        recipesByLabelTitle[labelTitle].push(savedRecipe.id);
      });
    });

    const savedImages = await Image.bulkCreate(pendingImageData.map(p => ({
      userId,
      location: p.image.location,
      key: p.image.key,
      json: p.image
    })), {
      returning: true,
      transaction: t
    });

    await Recipe_Image.bulkCreate(pendingImageData.map((p, idx) => ({
      recipeId: p.recipeId,
      imageId: savedImages[idx].id,
      order: p.order
    })), {
      transaction: t
    });

    await Promise.all(Object.keys(recipesByLabelTitle).map(async labelTitle => {
      const matchingLabels = await Label.findOrCreate({
        where: {
          userId: userId,
          title: labelTitle
        },
        transaction: t
      });

      await Recipe_Label.bulkCreate(recipesByLabelTitle[labelTitle].map(savedRecipeId => ({
        labelId: matchingLabels[0].id,
        recipeId: savedRecipeId
      })), {
        ignoreDuplicates: true,
        transaction: t
      });
    }));
  }).catch(err => {
    console.log(err)
    Raven.captureException(err);
  });
};

var Queue = require('bull');
var pepperplateQueue = new Queue('pepperplate-import', process.env.REDIS_CONN);

pepperplateQueue.process(MAX_JOB_COUNT, job => {
  console.log("Picking up import job");

  return User.findOne({
    where: {
      id: job.data.userId
    },
    include: [
      {
        model: FCMToken,
        as: 'fcmTokens',
        attributes: ['id', 'token']
      }
    ]
  }).then(async (user) => {
    console.log("Launching puppeteer");
    const browser = await puppeteer.launch({
      headless: !process.env.PUPPETEER_DISABLE_HEADLESS,
      executablePath: '/usr/bin/chromium-browser',
      args: ['--disable-dev-shm-usage', '--no-sandbox'],
      handleSIGTERM: false
    });

    console.log("Starting PP import");

    Raven.captureMessage('Starting import job', {
      level: 'info'
    });

    try {
      var username = job.data.pepperplateUser;
      var password = job.data.pepperplatePass;

      const page = await browser.newPage();

      await page.goto('https://www.pepperplate.com/login.aspx', {
        waitUntil: "networkidle2",
        timeout: 120000
      })

      await page.waitForSelector('#cphMain_loginForm_tbEmail')
      await page.waitForSelector('#cphMain_loginForm_tbPassword')
      await page.waitForSelector('#cphMain_loginForm_ibSubmit')

      await page.type('#cphMain_loginForm_tbEmail', username, { delay: 10 });

      await page.type('#cphMain_loginForm_tbPassword', password, { delay: 10 });

      const [response] = await Promise.all([
        page.waitForNavigation({
          waitUntil: "networkidle2",
          timeout: 120000
        }),
        page.click('#cphMain_loginForm_ibSubmit'),
      ]);

      await Promise.race([
        page.waitForSelector('.errors li'),
        page.waitForSelector('#reclist')
      ])

      if (await page.$('.errors li')) {
        UtilService.dispatchImportNotification(user, 1, 'invalidCredentials');

        console.log("invalid credentials")
        await browser.close();
        return
      }

      let recipeURLResults = await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          var interval = setInterval(() => {
            var loadMore = document.getElementById('loadmorelink');
            if (!document.getElementById('loadmorelink') || document.getElementById('loadmorelink').style.display == 'none') {
              clearInterval(interval);

              let recipeURLs = [].slice.call(document.querySelectorAll('#reclist .listing .item p a')).map(el => el.href);

              recipeURLs = [...new Set(recipeURLs)]; // Dedupe

              resolve(recipeURLs)
              // return [].slice.call(document.querySelectorAll('#reclist .listing .item p a')).map(function(el) { return el.href });
            } else {
              loadMore.click();
            }
          }, 1000);
        });
      });

      console.log(recipeURLResults)

      // Dispatch a progress notification
      UtilService.dispatchImportNotification(user, 2);

      let recipeResults = []
      for (var i = 0; i < recipeURLResults.length; i++) {
        await page.goto(recipeURLResults[i], {
          waitUntil: "domcontentloaded",
          timeout: 120000
        });

        await page.waitForSelector('.dircontainer', {
          visible: true
        });

        await page.waitFor(200); // Give pepperplate some rest time

        let recipeResult = await page.evaluate(() => {
          var els = {
            title: (document.getElementById('cphMiddle_cphMain_lblTitle') || {}).innerText,
            // description: (document.getElementById('cphMiddle_cphMain_lblYield') || {}).innerText,
            yield: (document.getElementById('cphMiddle_cphMain_lblYield') || {}).innerText,
            activeTime: (document.getElementById('cphMiddle_cphMain_lblActiveTime') || {}).innerText,
            totalTime: (document.getElementById('cphMiddle_cphMain_lblTotalTime') || {}).innerText,
            source: (document.getElementById('cphMiddle_cphMain_hlSource') || {}).innerText,
            url: (document.getElementById('cphMiddle_cphSidebar_hlOriginalRecipe') || {}).href,
            notes: (document.getElementById('cphMiddle_cphMain_lblNotes') || {}).innerText,
            ingredients: [].slice.call(document.querySelectorAll('.inggroups li ul li span.content')).map(function (el) { return el.innerText }).join("\r\n"),
            instructions: [].slice.call(document.querySelectorAll('.dirgroups li ol li span')).map(function (el) { return el.innerText }).join("\r\n"),
            imageURL: (document.getElementById('cphMiddle_cphMain_imgRecipeThumb') || { src: '' }).src,
            rawCategories: (document.querySelector('#cphMiddle_cphMain_pnlTags span') || { innerText: '' }).innerText.split(',').map(function (el) { return el.trim().toLowerCase() }).filter(el => el && el.length > 0)
          }

          return Promise.resolve(els)
        })

        recipeResults.push(recipeResult);
      }

      await browser.close();

      await saveRecipes(job.data.userId, recipeResults).then(function () {
        console.log("Import job completed");
        UtilService.dispatchImportNotification(user, 0);
        Raven.captureMessage('Import job completed succesfully', {
          level: 'info'
        });
      }).catch(function (err) {
        console.log(err);
        UtilService.dispatchImportNotification(user, 1, 'saving');
        Raven.captureException('Import job failed');
      });
    } catch(e) {
      console.log(e);
      Raven.captureException(e);

      UtilService.dispatchImportNotification(user, 1, 'timeout');

      await browser.close();
    }
  }).catch(e => {
    console.log(e);
    Raven.captureException(e);

    UtilService.dispatchImportNotification(user, 1, 'timeout');
  });
});

process.on('SIGTERM', () => {
  pepperplateQueue.close().then(() => {
    console.log('Bull shutdown gracefully.');
    process.exit(0);
  }, async err => {
    console.log('Bull closed with error "' + err.message + '".');
    await Raven.captureException(err);

    process.exit(1);
  });
});

console.log("Task worker started...");
