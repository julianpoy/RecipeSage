var express = require('express');
var router = express.Router();
let puppeteer = require('puppeteer');
var cors = require('cors');
var Raven = require('raven');
let multer = require('multer');
let fs = require('fs-extra');
let extract = require('extract-zip');
const { spawn } = require('child_process');
const performance = require('perf_hooks').performance;
let path = require('path');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var User = require('../models').User;
var Recipe = require('../models').Recipe;
var FCMToken = require('../models').FCMToken;
var Label = require('../models').Label;
var Recipe_Label = require('../models').Recipe_Label;

var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'RS API' });
});

router.get('/deduperecipelabels', function(req, res, next) {
  SQ.transaction(t => {
    return User.findAll({
      attributes: ['id'],
      transaction: t
    }).then(users => {
      return Promise.all(users.map(user => {
        let recipeIdsByLabelTitle = {};
        let labelIdsByLabelTitle = {};

        return Label.findAll({
          where: {
            userId: user.id
          },
          attributes: ['id', 'title'],
          include: [{
            model: Recipe,
            as: 'recipes',
            attributes: ['id']
          }],
          transaction: t
        }).then(labels => {
          return Promise.all(labels.map(label => {
            recipeIdsByLabelTitle[label.title] = recipeIdsByLabelTitle[label.title] || [];
            label.recipes.map(recipe => {
              recipeIdsByLabelTitle[label.title].push(recipe.id);
            })

            labelIdsByLabelTitle[label.title] = labelIdsByLabelTitle[label.title] || [];
            if (labelIdsByLabelTitle[label.title].indexOf(label.id) == -1) labelIdsByLabelTitle[label.title].push(label.id);
          }))
        }).then(() => {
          return Object.entries(labelIdsByLabelTitle).filter(([labelTitle, labelIds]) => labelIds.length > 1).length
        }).then(dupeCount => {
          if (dupeCount > 0) {
            return Label.destroy({
              where: {
                userId: user.id
              },
              transaction: t
            }).then(() => {
              return Label.bulkCreate(
                Object.entries(recipeIdsByLabelTitle)
                .filter(([labelTitle, recipeIds]) => labelTitle.trim().length > 0 && recipeIds.length > 0)
                .map(([labelTitle, recipeIds]) => {

                return {
                  userId: user.id,
                  title: labelTitle
                };
              }), {
                transaction: t
              }).then(labels => {
                return Recipe_Label.bulkCreate(
                  labels.reduce((acc, label) => {
                    let subQueries = recipeIdsByLabelTitle[label.title].map(recipeId => {
                      return {
                        labelId: label.id,
                        recipeId
                      }
                    });

                    acc.concat(subQueries);
                    return acc;
                  }, []), {
                    transaction: t
                  }
                )
              });
            })
          }
        })
      }))
    })
  }).catch(next);
})

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

  User.findOne({
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
  }).then(async (user) => {
    const browser = await puppeteer.launch({
      headless: (process.env.NODE_ENV || 'dev') !== 'dev'
    });

    Raven.captureMessage('Starting import job', {
      level: 'info'
    });

    res.status(200).json({
      msg: "Starting scrape..."
    });

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
            rawCategories: (document.querySelector('#cphMiddle_cphMain_pnlTags span') || { innerText: '' }).innerText.split(',').map(function (el) { return el.trim().toLowerCase() }).filter(el => el && el.length > 0)
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

router.post(
  '/import/livingcookbook',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  multer({
    dest: '/tmp/chefbook-lcb-import/',
  }).single('lcbdb'),
  async (req, res, next) => {
    if (!req.file) {
      res.status(400).send("Must include a file with the key lcbdb")
    } else {
      console.log(req.file.path)
    }

    let optionalFlags = [];
    if (req.query.excludeImages) optionalFlags.push('--excludeImages');
    if (req.query.includeStockRecipes) optionalFlags.push('--includeStockRecipes');
    if (req.query.includeTechniques) optionalFlags.push('--includeTechniques');

    let lcbImportJob = spawn(`node`, [`./lcbimport.app.js`, req.file.path, res.locals.session.userId, ...optionalFlags]);
    lcbImportJob.on('close', (code) => {
      switch (code) {
        case 0:
          res.status(200).json({
            msg: "Ok"
          });
          break;
        case 3:
          let badFileErr = new Error("Bad file format (not in .LCB ZIP format)");
          badFileErr.status = 406;
          next(badFileErr);
          break;
        default:
          let unexpectedErr = new Error("Import failed");
          unexpectedErr.status = 500;
          next(unexpectedErr);
          break;
      }
    });
  }
)

router.post(
  '/import/fdxz',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  multer({
    dest: '/tmp/chefbook-fdxz-import/',
  }).single('fdxzdb'),
  async (req, res, next) => {
    if (!req.file) {
      res.status(400).send("Must include a file with the key fdxdb")
    } else {
      console.log(req.file.path)
    }

    let optionalFlags = [];
    if (req.query.excludeImages) optionalFlags.push('--excludeImages');

    let lcbImportJob = spawn(`node`, [`./fdxzimport.app.js`, req.file.path, res.locals.session.userId, ...optionalFlags]);
    lcbImportJob.on('close', (code) => {
      switch (code) {
        case 0:
          res.status(200).json({
            msg: "Ok"
          });
          break;
        case 3:
          let badFileErr = new Error("Bad file format (not in .FDX or .FDXZ format)");
          badFileErr.status = 406;
          next(badFileErr);
          break;
        default:
          let unexpectedErr = new Error("Import failed");
          unexpectedErr.status = 500;
          next(unexpectedErr);
          break;
      }
    });
  }
)

router.post(
  '/import/paprika',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  multer({
    dest: '/tmp/paprika-import/',
  }).single('paprikadb'),
  async (req, res, next) => {
    if (!req.file) {
      res.status(400).send("Must include a file with the key lcbdb")
    } else {
      console.log(req.file.path)
    }

    Raven.captureMessage("Starting Paprika Import");

    let metrics = {
      t0: performance.now(),
      tExtracted: null,
      tRecipesProcessed: null,
      tRecipesSaved: null,
      tLabelsSaved: null
    }

    let zipPath = req.file.path;
    let extractPath = zipPath + '-extract';

    new Promise((resolve, reject) => {
      extract(zipPath, { dir: extractPath }, err => {
        if (err) {
          if (err.message === 'end of central directory record signature not found') err.status = 406;
          reject(err)
        }
        else resolve(extractPath);
      })
    }).then(extractPath => {
      metrics.tExtracted = performance.now();

      let labelMap = {};
      let pendingRecipes = [];
      return SQ.transaction(t => {
        return fs.readdir(extractPath).then(fileNames => {
          return fileNames.reduce((acc, fileName) => {
            return acc.then(() => {
              let filePath = path.join(extractPath, fileName);

              return fs.readFile(filePath).then(fileBuf => {
                return UtilService.gunzip(fileBuf).then(data => {
                  let recipeData = JSON.parse(data.toString());

                  let imageP = recipeData.photo_data ?
                    UtilService.sendFileToS3(new Buffer(recipeData.photo_data, "base64"), true) : Promise.resolve();

                  return imageP.then(image => {
                    let notes = [
                      recipeData.notes,
                      recipeData.nutritional_info ? `Nutritional Info: ${recipeData.difficulty}` : '',
                      recipeData.difficulty ? `Difficulty: ${recipeData.difficulty}` : '',
                      recipeData.rating ? `Rating: ${recipeData.rating}` : ''
                    ].filter(e => e && e.length > 0).join('\r\n');

                    let totalTime = [
                      recipeData.total_time,
                      recipeData.cook_time ? `(${recipeData.cook_time} cooking time)` : ''
                    ].filter(e => e).join(' ');

                    pendingRecipes.push({
                      model: {
                        userId: res.locals.session.userId,
                        title: recipeData.name,
                        image,
                        description: recipeData.description,
                        ingredients: recipeData.ingredients,
                        instructions: recipeData.directions,
                        yield: recipeData.servings,
                        totalTime,
                        activeTime: recipeData.prep_time,
                        notes,
                        source: recipeData.source,
                        folder: 'main',
                        fromUserId: null,
                        url: recipeData.source_url
                      },
                      labels: (recipeData.categories || []).map(e => e.trim().toLowerCase()).filter(e => e)
                    });
                  });
                })
              });
            });
          }, Promise.resolve()).then(() => {
            metrics.tRecipesProcessed = performance.now();

            return Recipe.bulkCreate(pendingRecipes.map(el => el.model), {
              returning: true,
              transaction: t
            }).then(recipes => {
              recipes.map((recipe, idx) => {
                pendingRecipes[idx].labels.map(labelTitle => {
                  labelMap[labelTitle] = labelMap[labelTitle] || [];
                  labelMap[labelTitle].push(recipe.id);
                })
              })
            })
          }).then(() => {
            metrics.tRecipesSaved = performance.now();

            return Promise.all(Object.keys(labelMap).map(labelTitle => {
              return Label.findOrCreate({
                where: {
                  userId: res.locals.session.userId,
                  title: labelTitle
                },
                transaction: t
              }).then(labels => {
                return Recipe_Label.bulkCreate(labelMap[labelTitle].map(recipeId => {
                  return {
                    labelId: labels[0].id,
                    recipeId
                  }
                }), {
                  transaction: t
                })
              });
            }))
          });
        });
      });
    }).then(() => {
      metrics.tLabelsSaved = performance.now();

      metrics.performance = {
        tExtract: Math.floor(metrics.tExtracted - metrics.t0),
        tRecipesProcess: Math.floor(metrics.tRecipesProcessed - metrics.tExtracted),
        tRecipesSave: Math.floor(metrics.tRecipesSaved - metrics.tRecipesProcessed),
        tLabelsSave: Math.floor(metrics.tLabelsSaved - metrics.tRecipesSaved)
      }

      Raven.captureMessage('Paprika Metrics', {
        extra: {
          metrics
        },
        user: res.locals.session.toJSON(),
        level: 'info'
      });

      res.status(201).json({});
    }).catch(err => {
      fs.removeSync(zipPath);
      fs.removeSync(extractPath);
      next(err);
    });
  }
)

router.get('/embed/recipe/:recipeId', (req, res, next) => {
  let redirectBase = req.headers.proxypassbase || '/';
  res.redirect(302, `${redirectBase}print/${req.params.recipeId}${req._parsedUrl.search}`);
});

module.exports = router;
