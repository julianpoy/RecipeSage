var express = require('express');
var router = express.Router();
var Nightmare = require('nightmare');
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

router.get(
  '/scrape/pepperplate',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

  User.find({
    where: {
      id: res.locals.session.userId
    },
    include: [
      {
        model: FCMToken,
        as: 'fcmTokens',
        attributes: ['id', 'token']
      }
    ]
  }).then(function(user) {

    Raven.captureMessage('Starting import job', {
      level: 'info'
    });

    var username = req.query.username;
    var password = req.query.password;

    var loginLink = 'https://www.pepperplate.com/login.aspx';

    var nightmare = Nightmare({
      show: true,
      executionTimeout: 300000
    });

    var WORKER_TIMEOUT_INTERVAL = 60 * 1000; // 60 Seconds
    function setWorkerTimeout() {
      return setTimeout(function() {
        UtilService.dispatchImportNotification(user, 1, 'timeout');
        Raven.captureException('Import job failed');
      }, WORKER_TIMEOUT_INTERVAL);
    }
    var workerTimeout = setWorkerTimeout();
    // UtilService.dispatchImportNotification(res.locals.user, 2);

    function saveRecipes(recipes) {
      return SQ.transaction(function(t) {

        return Promise.all(recipes.map(function(recipe) {
          return new Promise(function(resolve, reject) {
            if (recipe.imageURL) {
              UtilService.sendURLToS3(recipe.imageURL, function (err, image) {
                if (err) {
                  Raven.captureException(err);
                  reject();
                } else {
                  resolve(image);
                }
              });
            } else {
              resolve(null);
            }
          }).then(function(image) {
            return Recipe.create({
              userId: res.locals.session.userId,
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
            }, { transaction: t }).then(function(newRecipe) {
              Promise.all(recipe.rawCategories.map(function(rawCategory) {
                return Label.findOrCreate({
                  where: {
                    userId: res.locals.session.userId,
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
      });
    };

    function loadNext(nightmare, recipes, urls, idx) {
      // Raven.captureMessage('Loading next... ', urls[idx], ' currently fetching ', idx, ' of ', urls.length);

      nightmare
        .goto(urls[idx])
        .wait('#cphMiddle_cphMain_lblTitle')
        .evaluate(function () {
          var els = {
            title: (document.getElementById('cphMiddle_cphMain_lblTitle') || {}).innerText,
            // description: (document.getElementById('cphMiddle_cphMain_lblYield') || {}).innerText,
            yield: (document.getElementById('cphMiddle_cphMain_lblYield') || {}).innerText,
            activeTime: (document.getElementById('cphMiddle_cphMain_lblActiveTime') || {}).innerText,
            totalTime: (document.getElementById('cphMiddle_cphMain_lblTotalTime') || {}).innerText,
            source: (document.getElementById('cphMiddle_cphMain_hlSource') || {}).innerText,
            url: (document.getElementById('cphMiddle_cphSidebar_hlOriginalRecipe') || {}).href,
            notes: (document.getElementById('cphMiddle_cphMain_lblNotes') || {}).innerText,
            ingredients: [].slice.call(document.querySelectorAll('.inggroups li ul li span.content')).map(function(el) { return el.innerText }).join("\r\n"),
            instructions: [].slice.call(document.querySelectorAll('.dirgroups li ol li span')).map(function(el) { return el.innerText }).join("\r\n"),
            imageURL: (document.getElementById('cphMiddle_cphMain_imgRecipeThumb') || { src: '' }).src,
            rawCategories: (document.querySelector('#cphMiddle_cphMain_pnlTags span') || { innerText: '' }).innerText.split(',').map(function(el) { return el.trim() })
          }

          return els;
        })
        .then(function (result) {
          recipes.push(result);

          if (idx+1 < urls.length) {
            // Reset worker timeout
            clearTimeout(workerTimeout);
            workerTimeout = setWorkerTimeout();

            // Give pepperplate some resting time
            setTimeout(function() {
              loadNext(nightmare, recipes, urls, idx+1);
            }, 100); // MUST BE SIGNIFICANTLY LESS THAN WORKER TIMEOUT
          } else {
            // Finally, clear the worker timeout completely
            clearTimeout(workerTimeout);

            saveRecipes(recipes).then(function() {
              UtilService.dispatchImportNotification(user, 0);
              Raven.captureMessage('Import job completed succesfully', {
                level: 'info'
              });
            }).catch(function() {
              UtilService.dispatchImportNotification(user, 1, 'saving');
              Raven.captureException('Import job failed');
            });
          }
        })
        .catch(function (error) {
          clearTimeout(workerTimeout);
          UtilService.dispatchImportNotification(user, 1, 'timeout');
          Raven.captureException(error);
        });
    }

    nightmare
      .goto(loginLink)
      .type('#cphMain_loginForm_tbEmail', username)
      .type('#cphMain_loginForm_tbPassword', password)
      .click('#cphMain_loginForm_ibSubmit')
      .wait('.reclistnav')
      .evaluate(function () {
        return new Promise(function(resolve, reject) {
          var interval = setInterval(function() {
            var loadMore = document.getElementById('loadmorelink');
            if (!document.getElementById('loadmorelink') || document.getElementById('loadmorelink').style.display !== 'block') {
              clearInterval(interval);
              resolve([].slice.call(document.querySelectorAll('#reclist .listing .item p a')).map(function(el) { return el.href }))
              // return [].slice.call(document.querySelectorAll('#reclist .listing .item p a')).map(function(el) { return el.href });
            } else {
              loadMore.click();
            }
          }, 700);
        });
      })
      .then(function(results){
        // Raven.captureMessage("got to loadnext ", results, results.length);

        // Reset worker timeout
        clearTimeout(workerTimeout);
        workerTimeout = setWorkerTimeout();

        // Dispatch a progress notification
        UtilService.dispatchImportNotification(user, 2);

        // Load the next page of recipes
        loadNext(nightmare, [], results, 0);
      })
      .catch(function (error) {
        clearTimeout(workerTimeout);
        UtilService.dispatchImportNotification(user, 1, 'invalidCredentials');
        Raven.captureException(error);
      });

    res.status(200).json({
      msg: "Starting scrape..."
    });
  }).catch(next);
});

module.exports = router;
