var express = require('express');
var router = express.Router();
var Nightmare = require('nightmare');
var cors = require('cors');
var aws = require('aws-sdk');
var semver = require('semver');

// DB
var mongoose = require('mongoose');
var Recipe = mongoose.model('Recipe');
var Label = mongoose.model('Label');

var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');

var CURRENT_CLIENT_VERSION = '1.1.0';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/info', cors(), function(req, res, next) {
  var updateAvailable = semver.compare(CURRENT_CLIENT_VERSION, req.query.version) > 0;
  
  res.status(200).json({
    updateAvailable: updateAvailable
  });
});

router.get(
  '/scrape/pepperplate',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

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
              console.log("Error saving recipe on import: ", err);
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
                      console.log("Error saving label on import: ", err, rawCategory);
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
            console.log("Image response: ", err, image)
            
            if (err) {
              reject();
            } else {
              saveRecipe(image, function() {
                resolve();
              }, function() {
                reject();
              });
            }
          });
        } else {
          saveRecipe(null, function() {
            resolve();
          }, function() {
            reject();
          });
        }
      }));
    }
    
    Promise.all(savePromises).then(function() {
      UtilService.dispatchImportNotification(res.locals.user, 0);
    }, function() {
      UtilService.dispatchImportNotification(res.locals.user, 1, 'saving');
    });
  };
  
  function loadNext(nightmare, recipes, urls, idx) {
    console.log('Loading next... ', urls[idx], ' currently fetching ', idx, ' of ', urls.length);
    
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
          console.log('DONE', recipes);
          
          // Finally, clear the worker timeout completely
          clearTimeout(workerTimeout);
          
          saveRecipes(res.locals.session.accountId, recipes);
        }
      })
      .catch(function (error) {
        clearTimeout(workerTimeout);
        UtilService.dispatchImportNotification(res.locals.user, 1, 'timeout');
        console.error('Search failed:', error);
      });
  }
  
  console.log("starting nightmare...")
 
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
      console.log("got to loadnext ", results, results.length)

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
      console.log("caught well!")
      UtilService.dispatchImportNotification(res.locals.user, 1, 'invalidCredentials');
      console.error('Search failed:', error);
    });

  res.status(200).json({
    msg: "Starting scrape..."
  });
});

module.exports = router;
