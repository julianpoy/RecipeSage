var express = require('express');
var router = express.Router();
var cors = require('cors');

// DB
var Op = require('sequelize').Op;
var SQ = require('../models').sequelize;
var Recipe = require('../models').Recipe;
var Label = require('../models').Label;
var Recipe_Label = require('../models').Recipe_Label;

// Services
var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');

//Add a label to a recipeId or recipeIds
router.post(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

  const title = UtilService.cleanLabelTitle(req.body.title || '');

  if (!title || title.length === 0) {
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
        title
      },
      transaction: t
    }).then(([label]) => {
      return Recipe_Label.bulkCreate(recipeIds.map(recipeId => ({
        recipeId,
        labelId: label.id
      })), {
        ignoreDuplicates: true,
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

  const addlOptions = {};
  if (req.query.title) {
    addlOptions.title = req.query.title;
  }

  Label.findAll({
    where: {
      userId: res.locals.session.userId,
      ...addlOptions
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
    res.status(200).json(labels);
  })
  .catch(next);
});

//Get recipes associated with specific label
router.get(
  '/:labelId',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

  Label.findOne({
    where: {
      id: req.query.labelId,
      userId: res.locals.session.userId
    },
    include: [{
      model: Recipe_Label,
      as: 'recipe_labels',
      attributes: [],
    }],
    attributes: ['id', 'title', 'createdAt', 'updatedAt', [SQ.fn('COUNT', SQ.col('recipe_labels.id')), 'recipeCount']],
    group: ['Label.id']
  })
  .then(label => {
    res.status(200).json(label);
  })
  .catch(next);
});

//Combine two labels
router.post(
  '/merge',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

  if (!req.query.sourceLabelId || !req.query.targetLabelId) {
    return res.status(400).send("Must pass sourceLabelId and targetLabelId");
  }

  if (req.query.sourceLabelId === req.query.targetLabelId) {
    return res.status(400).send("Source label id cannot match destination label id");
  }

  return SQ.transaction(async transaction => {
    const sourceLabel = await Label.findOne({
      where: {
        id: req.query.sourceLabelId,
        userId: res.locals.session.userId
      },
      include: [{
        model: Recipe_Label,
        as: 'recipe_labels',
        attributes: ['recipeId'],
      }],
      transaction
    });

    if (!sourceLabel) return res.status("404").send("Source label not found");

    const targetLabel = await Label.findOne({
      where: {
        id: req.query.targetLabelId,
        userId: res.locals.session.userId
      },
      include: [{
        model: Recipe_Label,
        as: 'recipe_labels',
        attributes: ['recipeId'],
      }],
      transaction
    });

    if (!targetLabel) return res.status("404").send("Target label not found");

    const sourceLabelRecipeIds = sourceLabel.recipe_labels.map(recipeLabel => recipeLabel.recipeId)
    const targetLabelRecipeIds = targetLabel.recipe_labels.map(recipeLabel => recipeLabel.recipeId)

    const recipeIdsToUpdate = sourceLabelRecipeIds.filter(recipeId => !targetLabelRecipeIds.includes(recipeId));

    await Recipe_Label.update({
      labelId: req.query.targetLabelId
    }, {
      where: {
        labelId: req.query.sourceLabelId,
        recipeId: recipeIdsToUpdate
      },
      transaction
    });

    await Label.destroy({
      where: {
        id: req.query.sourceLabelId
      },
      transaction
    });
  }).then(() => {
    res.status(200).send("ok");
  }).catch(next);
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

  if (typeof req.body.title === 'string' && UtilService.cleanLabelTitle(req.body.title).length === 0) {
    var e = new Error("Label title must be longer than 0.");
    e.status = 400;
    return next(e);
  }

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
        if (typeof req.body.title === 'string') label.title = UtilService.cleanLabelTitle(req.body.title);

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
  '/delete-bulk',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

  if (!req.body.labelIds || !req.body.labelIds.length) {
    return res.status(412).json({
      msg: "LabelIds are required!"
    });
  }

  Label.destroy({
    where: {
      id: { [Op.in]: req.body.labelIds },
      userId: res.locals.session.userId
    }
  }).then(() => {
    res.status(200).send("ok");
  }).catch(next);
});

module.exports = router;
