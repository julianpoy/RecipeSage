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
    user_id: session.accountId,
		title: req.body.title
  }).save(function(err, dump, count) {
    if (err) {
      res.status(500).send("Error saving the recipe!");
    } else {
      dump = dump.toObject();
      dump.labels = [];
      res.status(201).json(dump);
    }
  });
});

//Get all of a user's links
router.get(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

  Recipe.find({
    user_id: res.locals.session.accountId
  }).sort('title').lean().exec(function(err, recipes) {
    if (err) {
      res.status(500).send("Couldn't search the database for dumps!");
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


//Update a link
router.put(
  '/:id',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res) {
  
  Recipe.findOne({
    _id: req.params.id,
    user_id: res.locals.session.accountId
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
      recipe.title = req.body.title;
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
    user_id: res.locals.session.accountId
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
            user_id: res.locals.session.accountId,
            dumps: req.params.id
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
                        dumps: recipe._id
                      }
                    }, {
                      new: true
                    }).exec(function(err, label) {
                    if (err) {
                      reject(500, "Couldn't search the database for labels during delete!");
                    } else {
                      if (label.dumps.length == 0) {
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
