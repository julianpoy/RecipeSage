var express = require('express');
var router = express.Router();
var cors = require('cors');

// DB
var mongoose = require('mongoose');
var Recipe = mongoose.model('Recipe');
var Label = mongoose.model('Label');

// Service
var SessionService = require('../services/sessions');
var MiddlewareService = require('../services/middleware');

//Create a new recipe
router.post(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

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
    instructions: req.body.instructions
  }).save(function(err, recipe) {
    if (err) {
      res.status(500).send("Error saving the recipe!");
    } else {
      recipe = recipe.toObject();
      recipe.labels = [];
      res.status(201).json(recipe);
    }
  });
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


//Update a recipe
router.put(
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

router.delete('/:id', function(req, res) {
  
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
