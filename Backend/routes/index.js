var express = require('express');
var router = express.Router();
var Nightmare = require('nightmare');
var cors = require('cors');
var aws = require('aws-sdk');
var semver = require('semver');
var Raven = require('raven');
var multer = require('multer');
var vision = require('@google-cloud/vision');
var visionStorage = multer({ dest: 'tmp/' });
var fs = require('fs');

// DB
var mongoose = require('mongoose');
var Recipe = mongoose.model('Recipe');
var Label = mongoose.model('Label');

var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');

var CURRENT_CLIENT_VERSION = '1.1.1';

// ---- GENERAL ----

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/info', cors(), function(req, res, next) {
  var updateAvailable = semver.compare(CURRENT_CLIENT_VERSION, req.query.version) > 0;

  res.status(200).json({
    updateAvailable: updateAvailable
  });
});

// ---- GOOGLE CLOUD ----

// Creates a vision client
var client = new vision.ImageAnnotatorClient({
  projectId: 'chef-book',
  keyFilename: './config/googlecloud-credentials.json',
});

function cleanupVisionStorage(filepath) {
  fs.unlink(filepath, function(err) {
    if(err) Raven.captureException(err);
  });
}

router.post('/vision', cors(), visionStorage.single('image'), function(req, res, next) {
  // Grabs text from within image
  client
    .documentTextDetection(req.file.path)
    .then(results => {
      console.log(results[0])
      res.status(200).json({
        text: results[0].fullTextAnnotation.text
      });
      cleanupVisionStorage(req.file.path);
    })
    .catch(err => {
      Raven.captureException(err);
      res.status(500).send('Failed to convert text');
      cleanupVisionStorage(req.file.path);
    });
});

// ---- SCRAPERS ----

router.get(
  '/scrape/pepperplate',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

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
      UtilService.dispatchImportNotification(res.locals.user, 1, 'timeout');
      Raven.captureException('Import job failed');
    }, WORKER_TIMEOUT_INTERVAL);
  }
  var workerTimeout = setWorkerTimeout();
  // UtilService.dispatchImportNotification(res.locals.user, 2);

  function saveRecipes(accountId, recipes) {
    var savePromises = [];
    for (var i = 0; i < recipes.length; i++) {
      let recipe = recipes[i];

      savePromises.push(new Promise(function(resolve, reject) {
        function saveRecipe(image, success, fail) {
          new Recipe({
            accountId: accountId,
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
          }).save(function(err, savedRecipe) {
            if (err) {
              Raven.captureException(err);
              fail();
            } else {
              var labelPromises = [];

              for (var i = 0; i < recipe.rawCategories.length; i++) {
                labelPromises.push(new Promise(function(resolveLabel, rejectLabel) {
                  let rawCategory = recipe.rawCategories[i].trim();

                  if (rawCategory.length === 0) {
                    resolveLabel();
                    return;
                  };

                  Label.findOneAndUpdate({
                    accountId: accountId,
                    title: rawCategory
                  }, {
                    $addToSet: {
                      "recipes": savedRecipe._id
                    }
                  }, {
                    safe: true,
                    upsert: true, // Create if not exists
                    new: true // Return updated, not original
                  }, function(err, label) {
                    if (err) {
                      Raven.captureException(err);
                      Raven.captureException(rawCategory);
                      rejectLabel();
                    } else {
                      resolveLabel();
                    }
                  });
                }));
              }

              // After all labels have been saved, sucess or fail the recipe save callback
              Promise.all(labelPromises).then(function() {
                success();
              }, function() {
                fail();
              });
            }
          });
        }

        if (recipe.imageURL) {
          UtilService.sendURLToS3(recipes[i].imageURL, function(err, image) {
            if (err) {
              Raven.captureException(err);
              reject();
            } else {
              saveRecipe(image, function() {
                resolve();
              }, function(err) {
                Raven.captureException(err);
                reject();
              });
            }
          });
        } else {
          saveRecipe(null, function() {
            resolve();
          }, function(err) {
            Raven.captureException(err);
            reject();
          });
        }
      }));
    }

    Promise.all(savePromises).then(function() {
      UtilService.dispatchImportNotification(res.locals.user, 0);
      Raven.captureMessage('Import job completed succesfully', {
        level: 'info'
      });
    }, function() {
      UtilService.dispatchImportNotification(res.locals.user, 1, 'saving');
      Raven.captureException('Import job failed');
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

          saveRecipes(res.locals.session.accountId, recipes);
        }
      })
      .catch(function (error) {
        clearTimeout(workerTimeout);
        UtilService.dispatchImportNotification(res.locals.user, 1, 'timeout');
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
      UtilService.dispatchImportNotification(res.locals.user, 2);

      // Load the next page of recipes
      loadNext(nightmare, [], results, 0);
    })
    .catch(function (error) {
      clearTimeout(workerTimeout);
      UtilService.dispatchImportNotification(res.locals.user, 1, 'invalidCredentials');
      Raven.captureException(error);
    });

  res.status(200).json({
    msg: "Starting scrape..."
  });
});

module.exports = router;
