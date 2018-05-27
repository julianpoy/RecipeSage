var express = require('express');
var router = express.Router();
var cors = require('cors');

// DB
var mongoose = require('mongoose');
var Recipe = mongoose.model('Recipe');
var Label = mongoose.model('Label');

// Services
var MiddlewareService = require('../services/middleware');

//Add a label to a recipe
router.post(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {
    
  if (!req.body.title || req.body.title.length === 0) {
    res.status(412).json({
      msg: "Label title must be provided."
    });
    return;
  }
  
  Recipe.findOneAndUpdate({
    accountId: res.locals.session.accountId,
    _id: req.body.recipeId
  }, {
    $setOnInsert: {
      updated: Date.now()
    }
  }, {
    new: true, // Triggers mongoose to return updated item
    upsert: false // Do not create a new recipe if not exists
  }, function(err, recipe) {
    if (err) {
      res.status(500).json({
        msg: "Couldn't search/update the dump!"
      });
    } else if (!recipe) {
      res.status(404).json({
        msg: "Recipe with specified ID does not exist!"
      });
    } else {
      Label.findOneAndUpdate({
        accountId: res.locals.session.accountId,
        title: req.body.title.toLowerCase()
      }, {
        $addToSet: {
          "recipes": recipe._id
        }
      }, {
        safe: true,
        upsert: true, // Create if not exists
        new: true // Return updated, not original
      }, function(err, label) {
        if (err) {
          res.status(500).json({
            msg: "Couldn't add to the database!"
          });
        } else {
          res.status(201).json(label);
        }
      });
    }
  });
});

//Get all of a user's labels
router.get(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

  var query = Label.find({
    accountId: res.locals.session.accountId
  }).sort('title');
  
  if (req.query.populate) query.populate('recipes');

  query.exec(function(err, labels) {
    if (err) {
      res.status(500).json({
        msg: "Could not query database for labels."
      });
    } else {
      res.status(200).json(labels);
    }
  });
});

//Delete a label from a recipe
router.delete(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res) {

  Label.findOneAndUpdate({
    _id: req.query.labelId,
    accountId: res.locals.session.accountId
  }, {
    $pull: { 'recipes': req.query.recipeId } // Pull the dump out of the array
  }, {
    new: true // Grab the updated document, not the original
  }, function(err, label) {
    if (err) {
      res.status(500).json({
        msg: "Couldn't search the database for label!"
      });
    } else if (!label) {
      res.status(404).json({
        msg: "Label does not exist!"
      });
    } else {
      if(label.recipes.length == 0){
        label.remove(function(err, data){
          if (err) {
            res.status(500).send("Could not remove empty label.");
          } else {
            res.status(200).json(data);
          }
        });
      } else {
        res.status(200).json(label);
      }
    }
  });
});

module.exports = router;
