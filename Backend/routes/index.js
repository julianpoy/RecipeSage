var express = require('express');
var router = express.Router();
let puppeteer = require('puppeteer');
var cors = require('cors');
var Raven = require('raven');
let multer = require('multer');
let fs = require('fs-extra');
let mdb = require('mdb');
let extract = require('extract-zip');
let sqlite3 = require('sqlite3');
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

let tablesNeeded = [
  // "t_attachment", //2x unused
  "t_authornote", // seems to be a cross between description (short) and notes (long) - sometimes very long (multiple entries per recipe, divided paragraph)
  // "t_cookbook_x", // unused from this db afaik
  // "t_favorite_x", //2x unused
  // "t_favoritefolder", //2x unused
  // "t_glossaryitem",
  // "t_groceryaisle",
  // "t_grocerylistitemrecipe",
  "t_image", // Holds filenames for all images
  // "t_ingredient",
  // "t_ingredientattachment",
  // "t_ingredientautocomplete",
  // "t_ingredientfolder",
  // "t_ingredientfolder_x",
  // "t_ingredientimage",
  // "t_meal", // Holds meal names with an abbreviation. No reference to any other table
  // "t_measure",
  // "t_measure_x",
  // "t_menu", // Holds menu info - has some "types" info that might be useful for labelling
  // "t_menu_x", // unused
  // "t_menuimage",
  "t_recipe",
  // "t_recipe_x", //2x unused
  // "t_recipeattachment", // 2x unused
  "t_recipeimage", // bidirectional relation table between recipe and image
  "t_recipeingredient",
  // "t_recipemeasure",
  "t_recipeprocedure",
  // "t_recipereview",
  "t_technique",
  "t_recipetechnique",
  "t_recipetip",
  // "t_recipetype", // seems to store category names, but no discernable relationship to recipe table - better to use recipetypes field in recipe itself (comma separated)
  // "t_recipetype_x", //2x unused
  // "t_grocerylistitem",
  // "t_ingredient_x", //2x unused
  // "t_ingredientmeasure", //not entirely clear - looks like a relationship table between ingredients and measurements
  // "t_recipemedia" //2x unused (or barely used)
]

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

    let sqliteDB;
    let lcbDB;
    let zipPath = req.file.path;
    let extractPath = zipPath + '-extract';
    let dbPath;
    let lcbTables;
    let schemaInitSQL;
    let tableInitSQL = {};
    let tableMap = {};

    let metrics = {
      t0: performance.now(),
      tExtracted: null,
      tExported: null,
      tSqliteStored: null,
      tSqliteFetched: null,
      tRecipeDataAssembled: null,
      tImagesUploaded: null,
      tRecipesProcessed: null,
      tRecipesSaved: null,
      tLabelsSaved: null
    }

    try {
      await new Promise((resolve, reject) => {
        sqliteDB = new sqlite3.Database(':memory:', (err) => {
          if (err) reject(err)
          else resolve()
        })
      });

      return new Promise((resolve, reject) => {
        extract(zipPath, { dir: extractPath }, function (err) {
          if (err) {
            if (err.message === 'end of central directory record signature not found') err.status = 406;
            reject(err)
          }
          else resolve();
        })
      })
      .then(() => {
        fs.unlinkSync(zipPath)
        return UtilService.findFilesByRegex(extractPath, /\.mdb/i)
      })
      .then(potentialDbPaths => {
        if (potentialDbPaths.length == 0) return Promise.reject()

        dbPath = potentialDbPaths[0];

        if (potentialDbPaths.length > 1) {
          console.log("More than one lcbdb path - ", potentialDbPaths)
          Raven.captureMessage("More than one lcbdb path - ", potentialDbPaths);
        } else {
          Raven.captureMessage("LCB DB Path - ", dbPath)
        }

        return dbPath
      }).then(dbPath => {
        metrics.tExtracted = performance.now();

        // Load mdb
        lcbDB = mdb(dbPath);
      }).then(() => {
        // Load lcb schema
        return new Promise((resolve, reject) => {
          lcbDB.schema((mdbSchemaErr, result) => {
            if (mdbSchemaErr) reject(mdbSchemaErr);
            schemaInitSQL = result
            resolve()
          })
        })
      }).then(() => {
        // Load table insert statements
        return new Promise((resolve, reject) => {
          lcbDB.tables((err, tables) => {
            if (err) {
              throw err
            }
            lcbTables = tables

            resolve()
          })
        }).then(() => Promise.all(
          lcbTables
            .filter(table => tablesNeeded.indexOf(table) !== -1)
            .map(table => new Promise((resolve, reject) =>
              lcbDB.toSQL(table, function (err, sql) {
                if (err && err !== "no output") return reject(err)
                if (!sql) return resolve()

                // tableInitSQL[table] = sql.match(/[^\r\n]+/g);
                tableInitSQL[table] = sql.split(';\nINSERT INTO '); // could be error prone

                resolve()
              })
            ))
          )
        )
      }).then(() => {
        metrics.tExported = performance.now();
      }).then(() => {
        // Send queries to database
        return new Promise((sqDbInitResolve, sqDbInitReject) => {
          sqliteDB.serialize(() => {
            let initStmts = schemaInitSQL.split(";");
            for (let i = 0; i < initStmts.length; i++) {
              let stmt = initStmts[i]

              sqliteDB.run(stmt, (sqliteErr) => {
                if (sqliteErr && sqliteErr.code !== "SQLITE_MISUSE") throw sqliteErr
              })
            }

            let tables = Object.keys(tableInitSQL)
            tables.forEach((tableName, idx) => {
              for (let i = 0; i < tableInitSQL[tableName].length; i++) {
                let sql = tableInitSQL[tableName][i].trim();
                if (sql.length == 0) continue;

                sql = sql.startsWith('INSERT INTO') ? sql : `INSERT INTO ${sql}`;

                sqliteDB.run(sql, (sqliteErr) => {
                  if (sqliteErr && sqliteErr.code !== "SQLITE_MISUSE") {
                    sqliteErr.query = sql;
                    throw sqliteErr
                  }

                  if (idx == tables.length - 1 && i == tableInitSQL[tableName].length - 1) {
                    sqDbInitResolve()
                  }
                })
              }
            })
          })
        })
      }).then(() => {
        metrics.tSqliteStored = performance.now();
      }).then(() => {
        return Promise.all(lcbTables.map(tableName => {
          return new Promise(resolve => {
            sqliteDB.all("SELECT * FROM " + tableName, [], (err, results) => {
              if (err) throw err;

              tableMap[tableName] = results;

              resolve();
            })
          })
        }))
      }).then(async () => {
        metrics.tSqliteFetched = performance.now();
        // return await fs.writeFile('output', JSON.stringify(tableMap))

        let labelMap = {};

        let pendingRecipes = [];

        tableMap.t_recipe = (tableMap.t_recipe || [])
          .filter(lcbRecipe => !!lcbRecipe.recipeid && (req.query.includeStockRecipes || !!lcbRecipe.modifieddate))

        let lcbImagesById = (tableMap.t_image || []).reduce((acc, image) => {
          acc[image.imageid] = image;
          return acc;
        }, {});

        let lcbImagesByRecipeId = (tableMap.t_recipeimage || []).reduce((acc, recipeImage) => {
          try {
            acc[recipeImage.recipeid] = acc[recipeImage.recipeid] || [];
            acc[recipeImage.recipeid].push({
              filename: lcbImagesById[recipeImage.imageid].filename,
              imageindex: parseInt(recipeImage.imageindex, 10)
            })
          } catch(e){}
          return acc;
        }, {})

        let lcbTechniquesById = (tableMap.t_technique || []).reduce((acc, technique) => {
          acc[technique.techniqueid] = technique;
          return acc;
        }, {});

        let lcbTechniquesByRecipeId = (tableMap.t_recipetechnique || []).reduce((acc, lcbRecipeTechnique) => {
          try {
            acc[lcbRecipeTechnique.recipeid] = acc[lcbRecipeTechnique.recipeid] || [];
            acc[lcbRecipeTechnique.recipeid].push(lcbTechniquesById[lcbRecipeTechnique.techniqueid]);
          } catch(e){}
          return acc;
        }, {});

        let lcbIngredientsByRecipeId = (tableMap.t_recipeingredient || []).reduce((acc, lcbIngredient) => {
          acc[lcbIngredient.recipeid] = acc[lcbIngredient.recipeid] || []
          acc[lcbIngredient.recipeid].push(lcbIngredient);
          return acc;
        }, {});

        let lcbInstructionsByRecipeId = (tableMap.t_recipeprocedure || []).reduce((acc, lcbInstruction) => {
          acc[lcbInstruction.recipeid] = acc[lcbInstruction.recipeid] || [];
          acc[lcbInstruction.recipeid].push(lcbInstruction);
          return acc;
        }, {});

        let lcbTipsByRecipeId = (tableMap.t_recipetip || []).reduce((acc, lcbTip) => {
          acc[lcbTip.recipeid] = acc[lcbTip.recipeid] || [];
          acc[lcbTip.recipeid].push(lcbTip);
          return acc;
        }, {});

        let lcbAuthorNotesById = (tableMap.t_authornote || []).reduce((acc, lcbAuthorNote) => {
          acc[lcbAuthorNote.recipeid] = acc[lcbAuthorNote.recipeid] || [];
          acc[lcbAuthorNote.recipeid].push(lcbAuthorNote);
          return acc;
        }, {});

        metrics.tRecipeDataAssembled = performance.now();

        return SQ.transaction(t => {
          let recipesWithImages = req.query.excludeImages ?
            [] : tableMap.t_recipe.map(lcbRecipe => {
              lcbRecipe.imageFileNames = (lcbImagesByRecipeId[lcbRecipe.recipeid] || [])
              .sort((a, b) => (a.imageindex || 0) - (b.imageindex || 0))
              .filter(e => e.filename)
              .map(e => e.filename);
              return lcbRecipe;
            }).filter(e => e.imageFileNames.length > 0);

          var i, chunkedRecipesWithImages = [], chunk = 50;
          for (i = 0; i < recipesWithImages.length; i += chunk) {
            chunkedRecipesWithImages.push(recipesWithImages.slice(i, i + chunk));
          }

          return chunkedRecipesWithImages.reduce((acc, lcbRecipeChunk) => {
            return acc.then(() => {
              return Promise.all(lcbRecipeChunk.map(lcbRecipe => {
                let imageFileNames = lcbRecipe.imageFileNames;

                if (imageFileNames.length == 0) return;

                // let possibleFileNameRegex = imageFileNames.join('|')
                let possibleFileNameRegex = imageFileNames[0];

                let possibleImageFiles = UtilService.findFilesByRegex(extractPath, new RegExp(`(${possibleFileNameRegex})$`, 'i'))

                if (possibleImageFiles.length == 0) return;

                return UtilService.sendFileToS3(possibleImageFiles[0]).then((image) => {
                  lcbRecipe.savedS3Image = image;
                }).catch(() => {})
              }))
            })
          }, Promise.resolve()).then(() => {
            metrics.tImagesUploaded = performance.now();

            return Promise.all(tableMap.t_recipe.map(lcbRecipe => {
              return Promise.resolve().then(() => {
                let image = lcbRecipe.savedS3Image || null;

                let ingredients = (lcbIngredientsByRecipeId[lcbRecipe.recipeid] || [])
                  .filter(lcbIngredient => lcbIngredient)
                  .sort((a, b) => a.ingredientindex > b.ingredientindex)
                  .map(lcbIngredient => `${lcbIngredient.quantitytext || ''} ${lcbIngredient.unittext || ''} ${lcbIngredient.ingredienttext || ''}`)
                  .join("\r\n")

                let instructions = (lcbInstructionsByRecipeId[lcbRecipe.recipeid] || [])
                  .filter(lcbProcedure => lcbProcedure && lcbProcedure.proceduretext)
                  .sort((a, b) => a.procedureindex > b.procedureindex)
                  .map(lcbProcedure => lcbProcedure.proceduretext)
                  .join("\r\n")

                let recipeTips = (lcbTipsByRecipeId[lcbRecipe.recipeid] || [])
                  .filter(lcbTip => lcbTip && lcbTip.tiptext)
                  .sort((a, b) => a.tipindex > b.tipindex)
                  .map(lcbTip => lcbTip.tiptext)

                let authorNotes = (lcbAuthorNotesById[lcbRecipe.recipeid] || [])
                  .filter(lcbAuthorNote => lcbAuthorNote && lcbAuthorNote.authornotetext)
                  .sort((a, b) => a.authornoteindex > b.authornoteindex)
                  .map(lcbAuthorNote => lcbAuthorNote.authornotetext)

                let techniqueNotes = (lcbTechniquesByRecipeId[lcbRecipe.recipeid] || [])
                  .filter(lcbTechnique => lcbTechnique && lcbTechnique.comments)
                  .map(lcbTechnique => `${lcbTechnique.name}:\r\n${lcbTechnique.comments}`)

                if (!req.query.includeTechniques) techniqueNotes = [];

                let description = ''

                let notes = []

                // Add comments to notes
                if (lcbRecipe.comments) notes.push(lcbRecipe.comments)

                // Add "author notes" to description or notes depending on length
                if (authorNotes.length == 1 && authorNotes[0].length <= 150) description = authorNotes[0]
                else if (authorNotes.length > 0) notes = [...notes, ...authorNotes]

                // Add recipeTips and join with double return
                notes = [...notes, ...recipeTips, ...techniqueNotes].join('\r\n\r\n')

                let createdAt = new Date(lcbRecipe.createdate || Date.now())
                let updatedAt = new Date(lcbRecipe.modifieddate || Date.now())

                let totalTime = (lcbRecipe.readyintime || '').toString().trim()
                if (lcbRecipe.cookingtime) {
                  totalTime += ` (${lcbRecipe.cookingtime.toString().trim()} cooking time)`;
                }
                totalTime = totalTime.trim();

                let lcbRecipeLabels = [...new Set((lcbRecipe.recipetypes || '').split(',').map(el => el.trim().toLowerCase()))].filter(el => el && el.length > 0)

                return pendingRecipes.push({
                  model: {
                    userId: res.locals.session.userId,
                    title: lcbRecipe.recipename || '',
                    description,
                    yield: (lcbRecipe.yield || '').toString(),
                    activeTime: (lcbRecipe.preparationtime || '').toString(),
                    totalTime,
                    source: lcbRecipe.source || '',
                    url: lcbRecipe.webpage || '',
                    notes,
                    ingredients,
                    instructions,
                    image: image,
                    folder: 'main',
                    fromUserId: null,
                    createdAt,
                    updatedAt
                  },
                  lcbRecipeLabels
                })
              })
            }))
          }).then(() => {
            metrics.tRecipesProcessed = performance.now();

            return Recipe.bulkCreate(pendingRecipes.map(el => el.model), {
              returning: true,
              transaction: t
            }).then(recipes => {
              recipes.map((recipe, idx) => {
                pendingRecipes[idx].lcbRecipeLabels.map(lcbLabelName => {
                  labelMap[lcbLabelName] = labelMap[lcbLabelName] || [];
                  labelMap[lcbLabelName].push(recipe.id);
                })
              })
            })
          }).then(() => {
            metrics.tRecipesSaved = performance.now();

            return Promise.all(Object.keys(labelMap).map(lcbLabelName => {
              return Label.findOrCreate({
                where: {
                  userId: res.locals.session.userId,
                  title: lcbLabelName
                },
                transaction: t
              }).then(labels => {
                return Recipe_Label.bulkCreate(labelMap[lcbLabelName].map(recipeId => {
                  return {
                    labelId: labels[0].id,
                    recipeId
                  }
                }), {
                  transaction: t
                })
              });
            }))
          }).then(() => {
            metrics.tLabelsSaved = performance.now();

            metrics.performance = {
              tExtract: Math.floor(metrics.tExtracted - metrics.t0),
              tExport: Math.floor(metrics.tExported - metrics.tExtracted),
              tSqliteStore: Math.floor(metrics.tSqliteStored - metrics.tExported),
              tSqliteFetch: Math.floor(metrics.tSqliteFetched - metrics.tSqliteStored),
              tRecipeDataAssemble: Math.floor(metrics.tRecipeDataAssembled - metrics.tSqliteFetched),
              tImagesUpload: Math.floor(metrics.tImagesUploaded - metrics.tRecipeDataAssembled),
              tRecipesProcess: Math.floor(metrics.tRecipesProcessed - metrics.tImagesUploaded),
              tRecipesSave: Math.floor(metrics.tRecipesSaved - metrics.tRecipesProcessed),
              tLabelsSave: Math.floor(metrics.tLabelsSaved - metrics.tRecipesSaved)
            }

            Raven.captureMessage('LCB Metrics', {
              extra: {
                metrics
              },
              user: res.locals.session.toJSON(),
              level: 'info'
            });

            try {
              sqliteDB.close()
            } catch(e){}
            fs.removeSync(zipPath)
            fs.removeSync(extractPath)
          })
        }).then(() => {
          res.status(200).json({
            msg: "Success!"
          });
        })
      }).catch(e => {
        try {
          sqliteDB.close()
        } catch (e) {}
        fs.removeSync(zipPath)
        fs.removeSync(extractPath)
        console.log("Couldn't handle lcb upload 1", e)
        next(e);
      })
    } catch(e) {
      try {
        sqliteDB.close()
      } catch (e) {}
      fs.removeSync(zipPath)
      fs.removeSync(extractPath)
      console.log("Couldn't handle lcb upload 2", e)
      next(e);
    }
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

module.exports = router;
