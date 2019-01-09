var express = require('express');
var router = express.Router();
var cors = require('cors');
var Raven = require('raven');

// DB
var SQ = require('../models').sequelize;
var User = require('../models').User;
var Recipe = require('../models').Recipe;
var Label = require('../models').Label;
var Recipe_Label = require('../models').Recipe_Label;

// Services
var MiddlewareService = require('../services/middleware');

//Add a label to a recipe
router.post(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

  if (!req.body.title || req.body.title.length === 0) {
    var e = new Error("Label title must be provided.");
    e.status = 412;
    return next(e);
  }

  if (!req.body.recipeId || req.body.recipeId.length === 0) {
    var e = new Error("RecipeId must be provided.");
    e.status = 412;
    return next(e);
  }

  SQ.transaction(function (t) {
    return Label.findOrCreate({
      where: {
        userId: res.locals.session.userId,
        title: req.body.title.toLowerCase()
      },
      transaction: t
    }).then(function(labels) {
      return labels[0].addRecipe(req.body.recipeId, {transaction: t}).then(function() {
        res.status(201).send(labels[0]);
      });
    });
  }).catch(next);
});

//Get all of a user's labels
router.get(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

  Label.findAll({
    where: {
      userId: res.locals.session.userId
    },
    include: [{
      model: Recipe,
      as: 'recipes',
      attributes: ['id', 'title']
    }],
    order: [
      ['title', 'ASC']
    ]
  })
  .then(function(labels) {
    res.status(200).json(labels);
  })
  .catch(next);
});

//Delete a label from a recipe
router.delete(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

  Label.findOne({
    where: {
      id: req.query.labelId,
      userId: res.locals.session.userId
    },
    include: [{
      model: Recipe,
      as: 'recipes',
      attributes: ['id']
    }]
  })
  .then(function(label) {
    if (!label) {
      res.status(404).json({
        msg: "Label does not exist!"
      });
    } else {
      return SQ.transaction(function (t) {
        return label.removeRecipe(req.query.recipeId, {transaction: t}).then(function() {
          if (label.recipes.length === 1) {
            return label.destroy({transaction: t}).then(function (data) {
              res.status(200).json({});
            });
          } else {
            res.status(200).json(label);
          }
        });
      });
    }
  })
  .catch(next);
});

module.exports = router;
