var express = require('express');
var router = express.Router();
let puppeteer = require('puppeteer');
var cors = require('cors');
var Raven = require('raven');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var User = require('../models').User;
var Recipe = require('../models').Recipe;
var FCMToken = require('../models').FCMToken;
var Label = require('../models').Label;

var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'RS API' });
});

function saveRecipes(userId, recipes) {
  return SQ.transaction(function (t) {

    return Promise.all(recipes.map(function (recipe) {
      return new Promise(function (resolve, reject) {
        if (recipe.imageURL) {
          UtilService.sendURLToS3(recipe.imageURL).then(resolve).catch(reject)
        } else resolve(null);
      }).then(function (image) {
        return Recipe.create({
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
          instructions: recipe.instructions,
          image: image
        }, { transaction: t }).then(function (newRecipe) {
          return Promise.all(recipe.rawCategories.map(function (rawCategory) {
            return Label.findOrCreate({
              where: {
                userId: userId,
                title: rawCategory.trim().toLowerCase()
              },
              transaction: t
            }).then(function (labels) {
              return labels[0].addRecipe(newRecipe.id, { transaction: t });
            });
          }));
        });
      })
    }));
  }).catch(err => {
    console.log(err)
    Raven.captureException(err);
  });
};

router.get(
  '/scrape/pepperplate',
  cors(),
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {

  User.find({
    where: {
      id: res.locals.session.userId
    },
    include: [
      {
        model: FCMToken,
        attributes: ['id', 'token']
      }
    ]
  }).then(async (user) => {
    Raven.captureMessage('Starting import job', {
      level: 'info'
    });

    res.status(200).json({
      msg: "Starting scrape..."
    });

    const browser = await puppeteer.launch({ headless: false });

    try {
      var username = req.query.username;
      var password = req.query.password;

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
            if (!document.getElementById('loadmorelink') || document.getElementById('loadmorelink').style.display !== 'block') {
              clearInterval(interval);

              let recipeURLs = [].slice.call(document.querySelectorAll('#reclist .listing .item p a')).map(el => el.href)

              resolve(recipeURLs)
              // return [].slice.call(document.querySelectorAll('#reclist .listing .item p a')).map(function(el) { return el.href });
            } else {
              loadMore.click();
            }
          }, 700);
        });
      })

      console.log(recipeURLResults)

      // Dispatch a progress notification
      UtilService.dispatchImportNotification(user, 2);

      let recipeResults = []
      for (var i = 0; i < recipeURLResults.length; i++) {
        await page.goto(recipeURLResults[i], {
          waitUntil: "networkidle2",
          timeout: 120000
        })

        // await page.waitFor(100) // Give pepperplate some rest time
        // await page.waitForSelector('#cphMiddle_cphMain_lblTitle', {
        //   visible: true
        // })

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
            rawCategories: (document.querySelector('#cphMiddle_cphMain_pnlTags span') || { innerText: '' }).innerText.split(',').map(function (el) { return el.trim() })
          }

          return Promise.resolve(els)
        })

        recipeResults.push(recipeResult);
      }

      await browser.close();

      saveRecipes(res.locals.session.userId, recipeResults).then(function () {
        UtilService.dispatchImportNotification(user, 0);
        Raven.captureMessage('Import job completed succesfully', {
          level: 'info'
        });
      }).catch(function (err) {
        UtilService.dispatchImportNotification(user, 1, 'saving');
        Raven.captureException('Import job failed');
        next(err)
      });
    } catch(e) {
      console.log(e)
      Raven.captureException(e);

      UtilService.dispatchImportNotification(user, 1, 'timeout');

      await browser.close();
    }
  }).catch(next);
});

module.exports = router;
