var express = require('express');
var router = express.Router();
var cors = require('cors');
var xmljs = require("xml-js");
var Raven = require('raven');

// DB
var SQ = require('../models').sequelize;
var User = require('../models').User;
var Recipe = require('../models').Recipe;
var Label = require('../models').Label;

// Service
var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');

//Create a new recipe
router.post(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  UtilService.upload.single('image'),
  function(req, res, next) {

  var folder = 'main'; // Default folder
  if (req.body.destinationUserEmail) { //We're sending the recipe to someone else
    folder = 'inbox';
  }

  // Check for title
  if (!req.body.title || req.body.title.length === 0) {
    // This request is bad due to no title, but we already uploaded an image for it. Delete the image before erroring out
    if (req.file && req.file.key) {
      UtilService.deleteS3Object(req.file.key, function() {
        res.status(412).send("Recipe title must be provided.");
      }, next);
    } else {
      res.status(412).send("Recipe title must be provided.");
    }
  } else {
    // Support for imageURLs instead of image files
    var uploadByURLPromise = new Promise(function(resolve, reject) {
      if (req.body.imageURL) {
        UtilService.sendURLToS3(req.body.imageURL, function(err, img) {
          if (err) {
            reject(err);
          } else {
            resolve(img);
          }
        });
      } else {
        resolve(null);
      }
    });

    uploadByURLPromise.then(function(img) {
      var uploadedFile = img || req.file;

      UtilService.findTitle(res.locals.session.userId, null, req.body.title, 1, function(adjustedTitle) {
        Recipe.create({
          userId: res.locals.session.userId,
      		title: adjustedTitle,
          description: req.body.description,
          yield: req.body.yield,
          activeTime: req.body.activeTime,
          totalTime: req.body.totalTime,
          source: req.body.source,
          url: req.body.url,
          notes: req.body.notes,
          ingredients: req.body.ingredients,
          instructions: req.body.instructions,
          image: uploadedFile,
          folder: folder
        })
        .then(function(recipe) {
          var serializedRecipe = recipe.toObject();
          serializedRecipe.labels = [];
          res.status(201).json(serializedRecipe);
        })
        .catch(next);
      }, next);
    }, next);
  }
});

//Get all of a user's recipes
router.get(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

  Recipe.findAll({
    where: {
      userId: res.locals.session.userId,
      folder: req.query.folder
    },
    attributes: ['id', 'title', 'description', 'source', 'image', 'folder', 'fromUserId', 'createdAt', 'updatedAt'],
    include: [{
      model: User,
      as: 'fromUser',
      attributes: ['name', 'email']
    },
    {
      model: Label,
      as: 'labels',
      attributes: ['id', 'title']
    }],
    order: [
      ['title', 'ASC']
    ],
  })
  .then(function(recipes) {
    res.status(200).json(recipes);
  })
  .catch(next);
});

router.get(
  '/export',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res) {

  Recipe.findAll({
    where: {
      userId: res.locals.session.userId,
    },
    include: [{
      model: User,
      as: 'fromUser',
      attributes: ['name', 'email']
    },
    {
      model: Label,
      as: 'labels',
      attributes: ['title']
    }],
    order: [
      ['title', 'ASC']
    ],
  })
  .then(function(recipes) {
    var data;
    var mimetype;

    switch (req.query.format) {
      case 'json':
        data = JSON.stringify(recipes);
        mimetype = 'application/json';
        break;
      case 'xml':
        data = xmljs.json2xml(recipes, { compact: true, ignoreComment: true, spaces: 4 });
        mimetype = 'text/xml';
        break;
      case 'txt':
        data = '';

        for (var i = 0; i < recipes.length; i++) {
          let recipe = recipes[i];

          recipe.labels = recipe.labels.map(function (el) {
            return el.title;
          }).join(',');

          for (var key in recipe) {
            if (recipe.hasOwnProperty(key)) {
              data += key + ': ';
              data += recipe[key] + '\r\n';
            }

          }
          data += '\r\n';
        }

        res.charset = 'UTF-8';
        mimetype = 'text/plain';
        break;
      default:
        res.status(400).send('Unknown export format. Please send json, xml, or txt.');
        return;
    }

    res.setHeader('Content-disposition', 'attachment; filename=recipes-' + Date.now() + '.' + req.query.format);
    res.setHeader('Content-type', mimetype);
    res.write(data, function (err) {
      if (err) {
        Raven.captureException("Could not write data response for export task.");
      }

      res.end();
    });
  })
  .catch(next);
});

//Get a single recipe
router.get(
  '/:recipeId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

  Recipe.findOne({
    where: {
      userId: res.locals.session.userId,
      id: req.params.recipeId
    },
    include: [{
      model: User,
      as: 'fromUser',
      attributes: ['name', 'email']
    },
    {
      model: Label,
      as: 'labels',
      attributes: ['id', 'title', 'createdAt', 'updatedAt']
    }],
    order: [
      ['title', 'ASC']
    ],
  })
  .then(function(recipe) {
    if (!recipe) {
      res.status(404).send("Recipe with that ID not found!");
    } else {
      res.status(200).json(recipe);
    }
  })
  .catch(next);
});

//Update a recipe
router.put(
  '/:id',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  UtilService.upload.single('image'),
  function(req, res) {

  Recipe.findOne({
    where: {
      id: req.params.id,
      userId: res.locals.session.userId
    }
  })
  .then(function(recipe) {
    if (!recipe) {
      res.status(404).json({
        msg: "Recipe with that ID does not exist!"
      });
    } else {
      return SQ.transaction(function(t) {
        if (typeof req.body.description === 'string') recipe.description = req.body.description;
        if (typeof req.body.yield === 'string') recipe.yield = req.body.yield;
        if (typeof req.body.activeTime === 'string') recipe.activeTime = req.body.activeTime;
        if (typeof req.body.totalTime === 'string') recipe.totalTime = req.body.totalTime;
        if (typeof req.body.source === 'string') recipe.source = req.body.source;
        if (typeof req.body.url === 'string') recipe.url = req.body.url;
        if (typeof req.body.notes === 'string') recipe.notes = req.body.notes;
        if (typeof req.body.ingredients === 'string') recipe.ingredients = req.body.ingredients;
        if (typeof req.body.instructions === 'string') recipe.instructions = req.body.instructions;
        if (typeof req.body.folder === 'string') recipe.folder = req.body.folder;

        // Check if user uploaded a new image. If so, delete the old image to save space and $$
        var oldImage = recipe.image;
        if (req.file) {
          recipe.image = req.file;
        }

        return UtilService.findTitle(res.locals.session.userId, recipe.id, req.body.title || recipe.title, 1).then(function(adjustedTitle) {
          recipe.title = adjustedTitle;

          return recipe.save({transaction: t}).then(function (recipe) {
            // Remove old (replaced) image from our S3 bucket
            if (req.file && oldImage && oldImage.key) {
              return UtilService.deleteS3Object(oldImage.key).then(function() {
                res.status(200).json(recipe);
              });
            }

            res.status(200).json(recipe);
          });
        });
      });
    }
  })
  .catch(function(err) {
    if (req.file) {
      return UtilService.deleteS3Object(recipe.image.key).then(function() {
        next(err);
      }).catch(function() {
        next(err);
      });
    }

    next(err);
  });
});

router.delete(
  '/:id',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res) {

  Recipe.findOne({
    where: {
      id: req.params.id,
      userId: res.locals.session.userId
    }
  })
  .then(function(recipe) {
    if (!recipe) {
      res.status(404).json({
        msg: "Recipe with specified ID does not exist!"
      });
    } else {
      return SQ.transaction(function(t) {
        return recipe.destroy({transaction: t}).then(function() {
          // Remove image from our S3 bucket
          if (recipe.image && recipe.image.key) {
            return UtilService.deleteS3Object(recipe.image.key).then(function() {
              res.status(200).json(recipe);
            });
          } else {
            res.status(200).json(recipe);
          }
        });
      });
    }
  })
  .catch(next);
});


module.exports = router;
