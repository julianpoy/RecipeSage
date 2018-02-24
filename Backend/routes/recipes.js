var express = require('express');
var router = express.Router();
var cors = require('cors');
var aws = require('aws-sdk');
var multer = require('multer');
var multerS3 = require('multer-s3');

// DB
var mongoose = require('mongoose');
var Recipe = mongoose.model('Recipe');
var Label = mongoose.model('Label');

// Service
var SessionService = require('../services/sessions');
var MiddlewareService = require('../services/middleware');
var config = require('../config/config.json');

var s3 = new aws.S3();
aws.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  subregion: config.aws.region,
});

var upload = multer({
  storage: multerS3({
    s3: s3,
    dirname: '/',
    bucket: config.aws.bucket,
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
});

function deleteS3Object(key, success, fail){
  s3.deleteObject({
    Bucket: config.aws.bucket,
    Key: key
  }, function(err, data) {
    if (err) fail(err);
    else success(data);
  });
}

//Create a new recipe
router.post(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  upload.single('image'),
  function(req, res, next) {
    
  if (!req.body.title || req.body.title.length === 0) {
    if (req.file && req.file.key) {
      deleteS3Object(req.file.key, function() {
        console.log("Cleaned s3 image after precondition failure");
        res.status(412).send("Recipe title must be provided.");
      }, function() {
        console.log("Failed to clean s3 image after precondition failure!");
        res.status(500).send("Original error: 412 - recipe title must be provided. While processing, there was another error: could not delete uploaded image from S3!");
      });
    } else {
      res.status(412).send("Recipe title must be provided.");
    }
  } else {
    var session = res.locals.session;

    new Recipe({
      accountId: session.accountId,
  		title: req.body.title,
      description: req.body.description,
      yield: req.body.yield,
      activeTime: req.body.activeTime,
      totalTime: req.body.totalTime,
      source: req.body.source,
      url: req.body.url,
      notes: req.body.notes,
      ingredients: req.body.ingredients,
      instructions: req.body.instructions,
      image: req.file
    }).save(function(err, recipe) {
      if (err) {
        res.status(500).send("Error saving the recipe!");
      } else {
        recipe = recipe.toObject();
        recipe.labels = [];
        res.status(201).json(recipe);
      }
    });
  }
});

//Get all of a user's recipes
router.get(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

  Recipe.find({
    accountId: res.locals.session.accountId
  }).sort('title').lean().exec(function(err, recipes) {
    if (err) {
      res.status(500).send("Couldn't search the database for recipes!");
    } else {
      
      var labelPromises = [];
      
      for (var i = 0; i < recipes.length; i++) {
        let recipe = recipes[i];
        
        labelPromises.push(new Promise(function(resolve, reject) {
          Label.find({
            recipes: recipe._id
          }).lean().exec(function(err, labels) {
            if (err) {
              reject(500, "Couldn't search the database for labels!");
            } else {
              recipe.labels = labels;
      
              resolve();
            }
          });
        }));
      }
      
      Promise.all(labelPromises).then(function() {
        res.status(200).json(recipes);
      }, function() {
        res.status(500).send("Could not query DB for labels.");
      });
    }
  });
});

//Get a single recipe
router.get(
  '/:recipeId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

  Recipe.findOne({
    accountId: res.locals.session.accountId,
    _id: req.params.recipeId
  }).lean().exec(function(err, recipe) {
    if (err) {
      res.status(500).send("Couldn't search the database for recipe!");
    } else {
      Label.find({
        recipes: recipe._id
      }).lean().exec(function(err, labels) {
        if (err) {
          res.status(500).send("Could not query DB for labels.");
        } else {
          recipe.labels = labels;
  
          res.status(200).json(recipe);
        }
      });
    }
  });
});

//Update a recipe
router.put(
  '/:id',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  upload.single('image'),
  function(req, res) {
  
  Recipe.findOne({
    _id: req.params.id,
    accountId: res.locals.session.accountId
  }, function(err, recipe) {
    if (err) {
      res.status(500).json({
        msg: "Couldn't search the database for recipe!"
      });
    } else if (!recipe) {
      res.status(404).json({
        msg: "Recipe with that ID does not exist!"
      });
    } else {
      if (typeof req.body.title === 'string') recipe.title = req.body.title;
      if (typeof req.body.description === 'string') recipe.description = req.body.description;
      if (typeof req.body.yield === 'string') recipe.yield = req.body.yield;
      if (typeof req.body.activeTime === 'string') recipe.activeTime = req.body.activeTime;
      if (typeof req.body.totalTime === 'string') recipe.totalTime = req.body.totalTime;
      if (typeof req.body.source === 'string') recipe.source = req.body.source;
      if (typeof req.body.url === 'string') recipe.url = req.body.url;
      if (typeof req.body.notes === 'string') recipe.notes = req.body.notes;
      if (typeof req.body.ingredients === 'string') recipe.ingredients = req.body.ingredients;
      if (typeof req.body.instructions === 'string') recipe.instructions = req.body.instructions;
      
      // Check if user uploaded a new image. If so, delete the old image to save space and $$
      if (req.file) {
        // Remove old (replaced) image from our S3 bucket
        if (recipe.image && recipe.image.key) {
          deleteS3Object(recipe.image.key, function() {
            console.log("Cleaned old image from s3", recipe.image.key);
          }, function(err) {
            console.log("Error cleaning old image from s3 ", err, err.stack);
          });
        }

        recipe.image = req.file;
      }

      recipe.updated = Date.now();

      recipe.save(function(err, recipe) {
        if (err) {
          res.status(500).send("Could not save updated recipe!");
        } else {
          res.status(200).json(recipe);
        }
      });
    }
  });
});

router.delete(
  '/:id',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res) {
  
  Recipe.findOne({
    _id: req.params.id,
    accountId: res.locals.session.accountId
  }, function(err, recipe) {
    if (err) {
      res.status(500).send({
        msg: "Couldn't search the database for recipe!"
      });
    } else if (!recipe) {
      res.status(404).json({
        msg: "Recipe with specified ID does not exist!"
      });
    } else {
      recipe.remove(function(err, recipe) {
        if (err) {
          res.status(500).json({
            msg: "Couldn't delete recipe from database"
          });
        } else {
          // Remove image from our S3 bucket
          if (recipe.image && recipe.image.key) {
            deleteS3Object(recipe.image.key, function() {
              console.log("Cleaned image from s3 after recipe delete ", recipe.image.key);
            }, function(err) {
              console.log("Error cleaning image from s3 after recipe delete ", err, err.stack);
            });
          }

          Label.find({
            accountId: res.locals.session.accountId,
            recipes: req.params.id
          }).select("_id").lean().exec(function(err, labels) {
            if (err) {
              res.status(500).json({
                msg: "Couldn't search the database for labels!"
              });
            } else if (!labels) {
              res.status(200).json(recipe);
            } else {
              var labelPromises = [];
      
              for (var i = 0; i < labels.length; i++) {
                let label = labels[i];
                
                labelPromises.push(new Promise(function(resolve, reject) {
                  Label.findByIdAndUpdate(
                    label._id, {
                      $pull: {
                        recipes: recipe._id
                      }
                    }, {
                      new: true
                    }).exec(function(err, label) {
                    if (err) {
                      reject(500, "Couldn't search the database for labels during delete!");
                    } else {
                      if (label.recipes.length == 0) {
                        label.remove(function(err, label) {
                          if (err) {
                            reject("Couldn't delete empty label!");
                          } else {
                            resolve();
                          }
                        });
                      } else {
                        resolve();
                      }
                    }
                  });
                }));
              }
              
              Promise.all(labelPromises).then(function() {
                res.status(200).json(recipe);
              }, function() {
                res.status(500).send("Could not delete labels from DB.");
              });
            }
          });
        }
      });
    }
  });
});


module.exports = router;
