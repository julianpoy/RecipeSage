const express = require('express');
const router = express.Router();
const pLimit = require('p-limit');
const xmljs = require("xml-js");
const multer = require('multer');

const MiddlewareService = require('../services/middleware');
const SubscriptionsService = require('../services/subscriptions');
const UtilService = require('../services/util');
const JSONLDService = require('../services/json-ld');

const {
  Recipe,
  User,
  Label,
  Recipe_Label,
  Image,
  Recipe_Image,
  sequelize,
} = require('../models');

const getRecipeDataForExport = async userId => {
  const results = await Recipe.findAll({
    where: {
      userId,
    },
    attributes: [
      'id',
      'title',
      'description',
      'yield',
      'activeTime',
      'totalTime',
      'source',
      'url',
      'notes',
      'ingredients',
      'instructions',
      'folder',
      'createdAt',
      'updatedAt',
      'userId',
    ],
    include: [{
      model: User,
      as: 'fromUser',
      attributes: ['name', 'email', 'handle']
    }, {
      model: Label,
      as: 'labels',
      attributes: ['title']
    }, {
      model: Image,
      as: 'images',
      attributes: ['id', 'location']
    }],
    order: [
      ['title', 'ASC']
    ],
  });

  const recipeData = results.map(e => e.toJSON());

  recipeData.forEach(recipe => recipe.labels.forEach(label => delete label.Recipe_Label));
  recipeData.forEach(recipe => recipe.images.forEach(image => delete image.Recipe_Image));

  return recipeData;
};

router.get('/export/xml',
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {
    try {
      const recipes = await getRecipeDataForExport(res.locals.session.userId);

      const exportData = {
        data: {
          recipe: recipes
        }
      };

      const xml = xmljs.json2xml(exportData, { compact: true, ignoreComment: true, spaces: 4 });

      if (req.query.download === 'true') res.setHeader('Content-disposition', `attachment; filename=recipesage-data-${Date.now()}.xml`);
      res.setHeader('Content-type', 'text/xml');
      res.write(xml);
      res.end();
    } catch(e) {
      next(e);
    }
  }
);

router.get('/export/txt',
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {
    try {
      const recipes = await getRecipeDataForExport(res.locals.session.userId);

      const exportData = {
        recipes
      };

      let data = '==== Recipes ====\n\n';

      for (var i = 0; i < exportData.recipes.length; i++) {
        let recipe = exportData.recipes[i];

        recipe.labels = recipe.labels.map(label => label.title).join(', ');

        recipe.images = recipe.images.map(image => image.location).join(', ');

        delete recipe.fromUser;

        for (var key in recipe) {
          if (recipe.hasOwnProperty(key)) {
            data += key + ': ';
            data += recipe[key] + '\r\n';
          }

        }
        data += '\r\n';
      }

      res.charset = 'UTF-8';

      if (req.query.download === 'true') res.setHeader('Content-disposition', `attachment; filename=recipesage-data-${Date.now()}.txt`);
      res.setHeader('Content-type', 'text/plain');
      res.write(data);
      res.end();
    } catch(e) {
      next(e);
    }
  }
);

router.get('/export/json-ld',
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {
    try {
      const recipes = await getRecipeDataForExport(res.locals.session.userId);

      const jsonLD = recipes.map(e => JSONLDService.recipeToJSONLD(e));

      const data = JSON.stringify(jsonLD);

      if (req.query.download === 'true') res.setHeader('Content-disposition', `attachment; filename=recipesage-data-${Date.now()}.json-ld.json`);
      res.setHeader('Content-type', 'application/ld+json');
      res.write(data);
      res.end();
    } catch(e) {
      next(e);
    }
  }
);

const CONCURRENT_IMAGE_IMPORTS = 2;
const MAX_IMAGES = 10;
const MAX_IMPORT_LIMIT = 10000; // A reasonable cutoff to make sure we don't kill the server for extremely large imports
const importStandardizedRecipes = async (userId, recipesToImport) => {
  const highResConversion = await SubscriptionsService.userHasCapability(
    userId,
    SubscriptionsService.CAPABILITIES.HIGH_RES_IMAGES
  );

  const canUploadMultipleImages = await SubscriptionsService.userHasCapability(
    userId,
    SubscriptionsService.CAPABILITIES.MULTIPLE_IMAGES
  );

  if (recipesToImport.length > MAX_IMPORT_LIMIT) {
    throw new Error("Too many recipes to import in one batch");
  }

  return sequelize.transaction(async transaction => {
    const limit = pLimit(CONCURRENT_IMAGE_IMPORTS);

    const recipes = await Recipe.bulkCreate(recipesToImport.map(recipe => ({
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
      folder: ['inbox', 'main'].includes(recipe.folder) ? recipe.folder : 'main',
      userId
    })), {
      returning: true,
      transaction
    });

    const labelMap = {};

    recipesToImport.forEach((recipeImport, idx) => {
      const recipe = recipes[idx];
      recipeImport.labels.map(labelTitle => {
        labelTitle = UtilService.cleanLabelTitle(labelTitle);
        labelMap[labelTitle] = labelMap[labelTitle] || [];
        labelMap[labelTitle].push(recipe.id);
      })
    })

    await Promise.all(Object.keys(labelMap).map(labelTitle => {
      return Label.findOrCreate({
        where: {
          userId,
          title: labelTitle
        },
        transaction
      }).then(labels => {
        return Recipe_Label.bulkCreate(labelMap[labelTitle].map(recipeId => {
          return {
            labelId: labels[0].id,
            recipeId
          }
        }), {
          ignoreDuplicates: true,
          transaction
        })
      });
    }));

    const imagesByRecipeIdx = await Promise.all(recipesToImport.map(async el => {
      if (!el.images) return [];

      return await Promise.all(
        el.images
          .filter((_, idx) => idx === 0 || canUploadMultipleImages)
          .filter((_, idx) => idx < MAX_IMAGES)
          .map(imageURL => limit(() => UtilService.sendURLToS3(imageURL, highResConversion)))
      );
    }));

    console.log(imagesByRecipeIdx);

    const pendingImages = imagesByRecipeIdx.map((images, recipeIdx) => images.map((image, imageIdx) => ({
      image,
      recipeId: recipes[recipeIdx].id,
      order: imageIdx
    }))).flat().filter(e => e);

    console.log(pendingImages)

    const savedImages = await Image.bulkCreate(pendingImages.map(p => ({
      userId,
      location: p.image.location,
      key: p.image.key,
      json: p.image
    })), {
      returning: true,
      transaction
    });

    await Recipe_Image.bulkCreate(pendingImages.map((p, idx) => ({
      recipeId: p.recipeId,
      imageId: savedImages[idx].id,
      order: p.order
    })), {
      transaction
    });
  });
}

router.post('/import/json-ld',
  MiddlewareService.validateSession(['user']),
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: '100MB', files: 1 }
  }).single('jsonLD'),
  async (req, res, next) => {
    try {
      let jsonLD = req.body.jsonLD;

      if (!jsonLD && req.file) jsonLD = JSON.parse(req.file.buffer.toString());

      if (!jsonLD) return res.status(400).send("No data. Only Recipe types are supported at this time.");

      if (!jsonLD.length && jsonLD['@type'] === 'Recipe') jsonLD = [jsonLD];

      jsonLD = jsonLD.filter(el => el['@type'] === 'Recipe');

      if (!jsonLD.length) return res.status(400).send("Only supports JSON-LD or array of JSON-LD with type 'Recipe'");

      const recipesToImport = jsonLD
        .map(ld => JSONLDService.jsonLDToRecipe(ld));

      await importStandardizedRecipes(res.locals.session.userId, recipesToImport);

      res.status(200).send('Imported');
    } catch(e) {
      next(e);
    }
  }
);

module.exports = router;

