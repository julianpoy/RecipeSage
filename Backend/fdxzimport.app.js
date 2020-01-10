let fs = require('fs-extra');
let mdb = require('mdb');
let extract = require('extract-zip');
var Raven = require('raven');
const xmljs = require('xml-js');

var Op = require("sequelize").Op;
var SQ = require('./models').sequelize;
var User = require('./models').User;
var Recipe = require('./models').Recipe;
var FCMToken = require('./models').FCMToken;
var Label = require('./models').Label;
var Recipe_Label = require('./models').Recipe_Label;
var Recipe_Image = require('./models').Recipe_Image;
var Image = require('./models').Image;

var UtilService = require('./services/util');

var RS_VERSION = JSON.parse(fs.readFileSync('./package.json')).version;

let runConfig = {
  path: process.argv[2],
  userId: process.argv[3],
  excludeImages: process.argv.indexOf('--excludeImages') > -1,
  multipleImages: process.argv.indexOf('--multipleImages') > -1,
}

var testMode = process.env.NODE_ENV === 'test';

if (fs.existsSync("./config/config.json")) {
  if (!testMode) console.log("config.json found");
} else {
  var content = fs.readFileSync('./config/config-template.json');
  fs.writeFileSync('./config/config.json', content);
  if (!testMode) console.log("config.json initialized");
}
var appConfig = require('./config/config.json');
var devMode = appConfig.environment === 'dev';

Raven.config(appConfig.sentry.dsn, {
  environment: appConfig.environment,
  release: RS_VERSION
}).install();

let logError = async err => {
  console.error(err);
  if (!devMode) {
    await new Promise(resolve => {
      Raven.captureException(err, {
        extra: {
          runConfig,
          user: runConfig.userId
        },
        user: runConfig.userId
      }, resolve);
    });
  }
}

let isCompressed = true; // FDXZ vs FDX
let zipPath = runConfig.path;
let extractPath = zipPath + '-extract';
let xmlPath;

function cleanup() {
  fs.removeSync(zipPath);
  fs.removeSync(extractPath);
}

// Convert input to array if necessary
function arrayifyAssociation(assoc) {
  if (!assoc) return [];
  if (typeof assoc.length === 'number') return assoc;
  return [assoc];
}

function fetchDeepProp(base, propName) {
  const flat = base[propName]; // RecipeInstruction format
  const nested = base[propName + 's']; // RecipeInstructions.RecipeInstructon format

  const raw = nested ? nested[propName] : flat; // Result is either an object, array, or null

  return arrayifyAssociation(raw);
}

async function main() {
  try {
    await (new Promise((resolve, reject) => {
      extract(zipPath, { dir: extractPath }, function (err) {
        if (err) {
          if (err.message === 'end of central directory record signature not found') {
            isCompressed = false;
            xmlPath = zipPath;
            resolve();
          } else {
            reject(err);
          }
        } else {
          xmlPath = extractPath + '/Data.xml';
          resolve();
        }
      });
    }));

    let xml;
    let data;
    try {
      xml = fs.readFileSync(xmlPath, "utf8");
      data = JSON.parse(xmljs.xml2json(xml, { compact: true, spaces: 4 }));
    } catch (err) {
      if (err.message.toLowerCase().includes("invalid attribute name")) {
        try {
          xml = xml.replace(/<RecipeNutrition.*\/>/g, '');
          data = JSON.parse(xmljs.xml2json(xml, { compact: true, spaces: 4 }));
        } catch (err) {
          fs.mkdirSync('/tmp/chefbook-fail-dump', { recursive: true });
          fs.copyFileSync(xmlPath, `/tmp/chefbook-fail-dump/fdxz-fail-${Math.floor(Math.random() * 10 ** 10)}.xml`);
          err.devmsg = "tried to replace RecipeNutrition, but failed";
          err.status = 3; // Unrecognized file, could not parse
          throw err;
        }
      } else {
        err.status = 3; // Unrecognized file
        throw err;
      }
    }

    xml = null; // Save memory

    const fdxData = (data.hixz || data.fdx || data.fdxz);

    let labelMap = {};

    const lcbCookbookNamesById = fetchDeepProp(fdxData, 'Cookbook')
      .filter(lcbCookbook => lcbCookbook && lcbCookbook._attributes && lcbCookbook._attributes.Name && lcbCookbook._attributes.ID)
      .reduce((acc, lcbCookbook) => {
        acc[lcbCookbook._attributes.ID] = lcbCookbook._attributes.Name;
        return acc;
      }, {});

    const pendingRecipes = fetchDeepProp(fdxData, 'Recipe').map(recipe => {
      let description = ''
      let notes = []

      // Add comments to notes
      if (recipe._attributes.Comments) notes.push(recipe._attributes.Comments)

      let recipeTips = fetchDeepProp(recipe, 'RecipeTip')
          .filter(lcbTip => lcbTip && lcbTip._text)
          .map(lcbTip => lcbTip._text)

      const authorNotes = fetchDeepProp(recipe, 'RecipeAuthorNote').map(authorNote => authorNote._text);

      // Add "author notes" to description or notes depending on length
      if (authorNotes.length == 1 && authorNotes[0].length <= 150) description = authorNotes[0]
      else if (authorNotes.length > 0) notes = [...notes, ...authorNotes]

      // Add recipeTips and join with double return
      notes = [...notes, ...recipeTips].join('\r\n\r\n')

      let totalTime = (recipe._attributes.ReadyInTime || '').toString().trim()
      if (recipe._attributes.CookingTime) {
        totalTime += ` (${(recipe._attributes.CookingTime || '').toString().trim()} cooking time)`;
      }
      totalTime = totalTime.trim();

      let ingredients = fetchDeepProp(recipe, 'RecipeIngredient')
          .map(lcbIngredient => lcbIngredient._attributes)
          .filter(lcbIngredient => lcbIngredient)
          .map(lcbIngredient => `${lcbIngredient.Quantity || ''} ${lcbIngredient.Unit || ''} ${lcbIngredient.Ingredient || ''}`)
          .join("\r\n")

      let instructions = fetchDeepProp(recipe, 'RecipeProcedure')
        .map(lcbInstruction => lcbInstruction.ProcedureText._text)
        .join("\r\n")

      let yield = recipe._attributes.Servings && recipe._attributes.Servings.length > 0 ? `${recipe._attributes.Servings} servings` : null;

      let lcbRecipeLabels = [
        ...new Set([
          ...(recipe._attributes.RecipeTypes || '').split(',').map(el => el.trim().toLowerCase()),
          ...[lcbCookbookNamesById[recipe.CookbookID] || ''].map(el => el.trim().toLowerCase())
        ])
      ].filter(el => el && el.length > 0)

      return {
        model: {
          userId: runConfig.userId,
          title: recipe._attributes.Name,
          description,
          yield,
          activeTime: recipe._attributes.PreparationTime,
          totalTime,
          source: recipe._attributes.Source,
          url: recipe._attributes.WebPage,
          notes,
          ingredients,
          instructions,
          folder: 'main',
          fromUserId: null,
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        original: recipe,
        lcbRecipeLabels,
        images: []
      }
    })

    await (SQ.transaction(async t => {
      let recipesWithImages = runConfig.excludeImages ?
        [] : pendingRecipes.map(pendingRecipe => {
          pendingRecipe.imageRefs = fetchDeepProp(pendingRecipe.original, 'RecipeImage');
          return pendingRecipe;
        }).filter(e => e.imageRefs.length > 0);

      var i, chunkedRecipesWithImages = [], chunk = 50;
      for (i = 0; i < recipesWithImages.length; i += chunk) {
        chunkedRecipesWithImages.push(recipesWithImages.slice(i, i + chunk));
      }

      await chunkedRecipesWithImages.reduce((acc, lcbRecipeChunk) => {
        return acc.then(() => {
          return Promise.all(lcbRecipeChunk.map(lcbRecipe => {
            let imageRefs = lcbRecipe.imageRefs;

            if (imageRefs.length == 0) return;

            if (!runConfig.multipleImages) imageRefs.splice(1); // Remove all but first image

            return Promise.all(lcbRecipe.imageRefs.map(imageRef => {
              if (imageRef._text) {
                return UtilService.sendFileToS3(Buffer.from(imageRef._text, 'base64'), true).then(image => {
                  lcbRecipe.images.push(image);
                }).catch(() => { })
              }

              // let possibleFileNameRegex = imageFileNames.join('|')
              let possibleFileNameRegex = imageRef._attributes.FileName;

              let possibleImageFiles = UtilService.findFilesByRegex(extractPath, new RegExp(`(${possibleFileNameRegex})$`, 'i'))

              if (possibleImageFiles.length == 0) return;

              return UtilService.sendFileToS3(possibleImageFiles[0]).then((image) => {
                lcbRecipe.images.push(image);
              }).catch(() => { })
            }));
          }))
        })
      }, Promise.resolve())

      let recipes = await Recipe.bulkCreate(pendingRecipes.map(el => el.model), {
        returning: true,
        transaction: t
      })

      const pendingRecipeImages = [];
      recipes.map((recipe, idx) => {
        pendingRecipeImages.push(...pendingRecipes[idx].images.map((image, idx) => ({
          image,
          recipeId: recipe.id,
          order: idx // This may need to be improved - currently it just depends on which image finishes uploading first
        })));

        pendingRecipes[idx].lcbRecipeLabels.map(lcbLabelName => {
          labelMap[lcbLabelName] = labelMap[lcbLabelName] || [];
          labelMap[lcbLabelName].push(recipe.id);
        })
      })

      await Promise.all(Object.keys(labelMap).map(lcbLabelName => {
        return Label.findOrCreate({
          where: {
            userId: runConfig.userId,
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

      const savedImages = await Image.bulkCreate(pendingRecipeImages.map(p => ({
        userId: runConfig.userId,
        location: p.image.location,
        key: p.image.key,
        json: p.image
      })), {
        returning: true,
        transaction: t
      });

      await Recipe_Image.bulkCreate(pendingRecipeImages.map((p, idx) => ({
        recipeId: p.recipeId,
        imageId: savedImages[idx].id,
        order: p.order
      })), {
        transaction: t
      });
    }))

    await new Promise(resolve => {
      Raven.captureMessage('FDX(Z) Complete', {
        extra: {
          runConfig,
          user: runConfig.userId
        },
        user: runConfig.userId,
        level: 'info'
      }, resolve);
    });

    cleanup()

    process.exit(0);
  } catch (e) {
    cleanup();

    console.log("Couldn't handle lcb upload 2", e)
    await logError(e);

    try {
      if (e && e.status) {
        process.exit(e.status);
      } else process.exit(1);
    } catch (e) {
      process.exit(1);
    }
  }
}

main();
