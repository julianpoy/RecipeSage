var express = require('express');
var router = express.Router();
var cors = require('cors');
var Raven = require('raven');

// DB
var Op = require('sequelize').Op;
var SQ = require('../models').sequelize;
var Recipe = require('../models').Recipe;
var Label = require('../models').Label;
var Recipe_Label = require('../models').Recipe_Label;

// Services
var MiddlewareService = require('../services/middleware');

//Add a label to a recipeId or recipeIds
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

  if ((!req.body.recipeId || req.body.recipeId.length === 0) && (!req.body.recipeIds || req.body.recipeIds.length === 0)) {
    var e = new Error("RecipeId or recipeIds must be provided.");
    e.status = 412;
    return next(e);
  }

  let recipeIds = req.body.recipeId ? [req.body.recipeId] : req.body.recipeIds;

  SQ.transaction(t => {
    return Label.findOrCreate({
      where: {
        userId: res.locals.session.userId,
        title: req.body.title.toLowerCase().replace(',', '')
      },
      transaction: t
    }).then(([label]) => {
      return Recipe_Label.bulkCreate(recipeIds.map(recipeId => ({
        recipeId,
        labelId: label.id
      })), {
        transaction: t
      }).then(() => {
        return label
      });
    });
  }).then(label => {
    res.status(201).send(label);
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
      model: Recipe_Label,
      as: 'recipe_labels',
      attributes: [],
    }],
    attributes: ['id', 'title', 'createdAt', 'updatedAt', [SQ.fn('COUNT', SQ.col('recipe_labels.id')), 'recipeCount']],
    group: ['Label.id'],
    order: [
      ['title', 'ASC']
    ]
  })
  .then(function(labels) {
    labels = labels.map(label => { label = label.toJSON(); label.recipes = []; return label; })
    res.status(200).json(labels);
  })
  .catch(next);
});

//Delete a label from a recipe
router.delete(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {

  if (!req.query.recipeId || !req.query.labelId) {
    return res.status(412).json({
      msg: "RecipeId and LabelId are required!"
    });
  }

  try {
    await SQ.transaction(async transaction => {
      const label = await Label.findOne({
        where: {
          id: req.query.labelId,
          userId: res.locals.session.userId
        },
        include: [{
          model: Recipe,
          as: 'recipes',
          attributes: ['id']
        }],
        transaction
      });

      if (!label || !label.recipes.some(r => r.id == req.query.recipeId)) {
        const e = new Error("Label does not exist!");
        e.status = 404;
        throw e;
      }

      await label.removeRecipe(req.query.recipeId, {
        transaction
      })

      if (label.recipes.length === 1) {
        await label.destroy({transaction});

        return {}; // Label was deleted;
      } else {
        return label;
      }
    }).then(label => {
      res.status(200).json(label);
    });
  } catch(e) {
    next(e);
  }
});

// Update label for all associated recipes
router.put(
  '/:id',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

  SQ.transaction(t => {
    return Label.findOne({
      where: {
        id: req.params.id,
        userId: res.locals.session.userId
      }
    }).then(label => {
      if (!label) {
        res.status(404).json({
          msg: "Label with that ID does not exist!"
        });
      } else {
        if (typeof req.body.title === 'string') label.title = req.body.title.toLowerCase().replace(',', '');

        return Label.findAll({
          where: {
            id: { [Op.ne]: label.id },
            title: req.body.title,
            userId: res.locals.session.userId
          },
          transaction: t
        }).then(labels => {
          if (labels && labels.length > 0) {
            res.status(409).json({
              msg: "Label with that title already exists!"
            });
          } else {
            return label.save({ transaction: t }).then(label => {
              res.status(200).json(label);
            });
          }
        });
      }
    });
  }).catch(next);
});

// Delete labels from all associated recipes
router.post(
  '/delete',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

  if (!req.query.labelIds) {
    return res.status(412).json({
      msg: "LabelIds are required!"
    });
  }

  Label.delete({
    where: {
      id: { [Op.in]: req.body.labelIds },
      userId: res.locals.session.userId
    }
  })
  .then(function(label) {
    res.status(200).send("ok");
  })
  .catch(next);
});

module.exports = router;
