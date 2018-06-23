var express = require('express');
var router = express.Router();
var cors = require('cors');
var xmljs = require("xml-js");
var Raven = require('raven');

// DB
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Recipe = mongoose.model('Recipe');
var Label = mongoose.model('Label');

// Service
var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');

router.get('/',
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

  var modifiers = [];
  if (req.query.modifiers) modifiers = req.query.modifiers.split(',');

  var templates = ['default', 'halfsheet'];
  if (templates.indexOf(req.query.template) === -1) {
    res.render('error', {
      message: '404',
      error: {
        status: 'Print template not found',
        stack: ''
      }
    });
    return;
  }

  Recipe.findOne({
    _id: req.query.recipeId
  }).lean().exec(function(err, recipe) {
    if (err) {
      res.render('error', {
        message: '500',
        error: {
          status: 'Error while loading recipe',
          stack: ''
        }
      });
    } else if (!recipe) {
      res.render('error', {
        message: '404',
        error: {
          status: 'Recipe not found',
          stack: ''
        }
      });
    } else {
      Label.find({
        recipes: recipe._id
      }).lean().exec(function (err, labels) {
        if (err) {
          res.render('error', {
            message: '500',
            error: {
              status: 'Error while loading recipe',
              stack: ''
            }
          });
        } else {
          if (labels) recipe.labels = labels;
          else recipe.labels = [];
          recipe.instructions = recipe.instructions.split(/\r?\n/);
          recipe.ingredients = recipe.ingredients.split(/\r?\n/);

          if (modifiers.indexOf('noimage') > -1) {
            delete recipe.image;
          }

          res.render('recipe-' + req.query.template, { recipe: recipe, date: (new Date).toDateString(), modifiers: modifiers });
        }
      });
    }
  });
});

module.exports = router;
