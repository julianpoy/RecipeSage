var express = require('express');
var router = express.Router();
var cors = require('cors');
var xmljs = require("xml-js");
var Raven = require('raven');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var Recipe = require('../models').Recipe;
var Label = require('../models').Label;

// Service
var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');

router.get('/',
  MiddlewareService.validateSession(['user']),
  function (req, res, next) {

  var modifiers = [];
  if (req.query.modifiers) modifiers = req.query.modifiers.split(',');

  var templates = ['default', 'halfsheet', 'compact'];
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

  Recipe.find({
    where: {
      id: req.query.recipeId
    },
    include: [
      {
        model: Label,
        as: 'labels'
      }
    ]
  }).then(function(recipe) {
    if (!recipe) {
      res.render('error', {
        message: '404',
        error: {
          status: 'Recipe not found',
          stack: ''
        }
      });
    } else {
      let r = recipe.toJSON();

      r.instructions = r.instructions.split(/\r?\n/);
      r.ingredients = r.ingredients.split(/\r?\n/);

      if (modifiers.indexOf('noimage') > -1) {
        delete r.image;
      }

      res.render('recipe-' + req.query.template, { recipe: r, date: (new Date).toDateString(), modifiers: modifiers });
    }
  }).catch(function(err) {
    res.render('error', {
      message: '500',
      error: {
        status: 'Error while loading recipe',
        stack: ''
      }
    });

    next(err);
  });
});

module.exports = router;
