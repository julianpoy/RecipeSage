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
  // "t_technique",
  // "t_recipetechnique",
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

    try {
      await new Promise((resolve, reject) => {
        sqliteDB = new sqlite3.Database(':memory:', (err) => {
          if (err) reject(err)
          else resolve()
        })
      });

      return new Promise((resolve, reject) => {
        extract(zipPath, { dir: extractPath }, function (err) {
          if (err) reject(err);
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
                sqliteDB.run(`INSERT INTO ${tableInitSQL[tableName][i]}`, (sqliteErr) => {
                  if (sqliteErr && sqliteErr.code !== "SQLITE_MISUSE") {
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
        // return await fs.writeFile('output', JSON.stringify(tableMap))

        let labelMap = {};

        let pendingRecipes = [];

        tableMap.t_recipe = (tableMap.t_recipe || [])
          .filter(lcbRecipe => !!lcbRecipe.recipeid && !!lcbRecipe.modifieddate)

        return SQ.transaction(t => {
          return Promise.all(tableMap.t_recipe.map(lcbRecipe => {
            return new Promise(resolve => {
              let lcbImages = (tableMap.t_recipeimage || [])
                .filter(el => el.recipeid == lcbRecipe.recipeid)
                .sort((a, b) => a.imageindex > b.imageindex)

              if (lcbImages.length == 0) return resolve()

              let possibleFileNameRegex = [
                `recipe${lcbRecipe.recipeid}\.gif`,
                `recipe${lcbRecipe.recipeid}\.jpg`,
                `recipe${lcbRecipe.recipeid}\.jpeg`,
                `recipeimage${lcbRecipe.recipeid}\.gif`,
                `recipeimage${lcbRecipe.recipeid}\.jpg`,
                `recipeimage${lcbRecipe.recipeid}\.jpeg`
              ].join('|')

              let possibleImageFiles = UtilService.findFilesByRegex(extractPath, new RegExp(`(${possibleFileNameRegex})$`, 'i'))

              if (possibleImageFiles.length == 0) return resolve()

              UtilService.sendFileToS3(possibleImageFiles[0]).then(resolve).catch(() => {
                resolve(null)
              })
            }).then(image => {
              let ingredients = (tableMap.t_recipeingredient || [])
                .filter(el => el.recipeid == lcbRecipe.recipeid)
                .sort((a, b) => a.ingredientindex > b.ingredientindex)
                .map(lcbIngredient => `${lcbIngredient.quantitytext || ''} ${lcbIngredient.unittext || ''} ${lcbIngredient.ingredienttext || ''}`)
                .join("\r\n")

              let instructions = (tableMap.t_recipeprocedure || [])
                .filter(el => el.proceduretext && el.recipeid == lcbRecipe.recipeid)
                .sort((a, b) => a.procedureindex > b.procedureindex)
                .map(lcbProcedure => lcbProcedure.proceduretext)
                .join("\r\n")

              let recipeTips = (tableMap.t_recipetip || [])
                .filter(el => el.tiptext && el.recipeid == lcbRecipe.recipeid)
                .sort((a, b) => a.tipindex > b.tipindex)
                .map(lcbTip => lcbTip.tiptext)

              let authorNotes = (tableMap.t_authornote || [])
                .filter(el => el.authornotetext && el.recipeid == lcbRecipe.recipeid)
                .sort((a, b) => a.authornoteindex > b.authornoteindex)
                .map(lcbAuthorNote => lcbAuthorNote.authornotetext)

              let description = ''

              let notes = []

              // Add comments to notes
              if (lcbRecipe.comments) notes.push(lcbRecipe.comments)

              // Add "author notes" to description or notes depending on length
              if (authorNotes.length == 1 && authorNotes[0].length <= 150) description = authorNotes[0]
              else if (authorNotes.length > 0) notes = [...notes, ...authorNotes]

              // Add recipeTips and join with double return
              notes = [...notes, ...recipeTips].join('\r\n\r\n')

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
          })).then(() => {
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

module.exports = router;
