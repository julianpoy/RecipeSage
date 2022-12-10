const express = require('express');
const router = express.Router();
const cors = require('cors');

// DB
const Op = require('sequelize').Op;
const SQ = require('../models').sequelize;
const Recipe = require('../models').Recipe;
const Label = require('../models').Label;
const Recipe_Label = require('../models').Recipe_Label;

// Services
const MiddlewareService = require('../services/middleware');
const UtilService = require('../services/util');

// Util
const { wrapRequestWithErrorHandler } = require('../utils/wrapRequestWithErrorHandler');
const { BadRequest, NotFound, Conflict, PreconditionFailed } = require('../utils/errors');


//Add a label to a recipeId or recipeIds
router.post(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {

    const title = UtilService.cleanLabelTitle(req.body.title || '');

    if (!title || title.length === 0) {
      throw PreconditionFailed('Label title must be provided.');
    }

    if ((!req.body.recipeId || req.body.recipeId.length === 0) && (!req.body.recipeIds || req.body.recipeIds.length === 0)) {
      throw PreconditionFailed('RecipeId or recipeIds must be provided.');
    }

    const recipeIds = req.body.recipeId ? [req.body.recipeId] : req.body.recipeIds;

    const label = await SQ.transaction(async (transaction) => {
      const [label] = await Label.findOrCreate({
        where: {
          userId: res.locals.session.userId,
          title
        },
        transaction,
      });

      await Recipe_Label.bulkCreate(recipeIds.map(recipeId => ({
        recipeId,
        labelId: label.id
      })), {
        ignoreDuplicates: true,
        transaction,
      });

      return label;
    });

    res.status(201).send(label);
  }));

//Get all of a user's labels
router.get(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {

    const addlOptions = {};
    if (req.query.title) {
      addlOptions.title = req.query.title;
    }

    const labels = await Label.findAll({
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
    });

    res.status(200).json(labels);
  }));

//Get recipes associated with specific label
router.get(
  '/:labelId',
  cors(),
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {

    const label = await Label.findOne({
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
    });

    res.status(200).json(label);
  }));

//Combine two labels
router.post(
  '/merge',
  cors(),
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {

    if (!req.query.sourceLabelId || !req.query.targetLabelId) {
      throw BadRequest('Must pass sourceLabelId and targetLabelId');
    }

    if (req.query.sourceLabelId === req.query.targetLabelId) {
      throw BadRequest('Source label id cannot match destination label id');
    }

    await SQ.transaction(async transaction => {
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

      if (!sourceLabel) {
        throw NotFound('Source label not found');
      }

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

      if (!targetLabel) {
        throw NotFound('Target label not found');
      }

      const sourceLabelRecipeIds = sourceLabel.recipe_labels.map(recipeLabel => recipeLabel.recipeId);
      const targetLabelRecipeIds = targetLabel.recipe_labels.map(recipeLabel => recipeLabel.recipeId);

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
    });

    res.status(200).send('ok');
  }));

//Delete a label from a recipe
router.delete(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {

    if (!req.query.recipeId || !req.query.labelId) {
      throw PreconditionFailed('RecipeId and LabelId are required!');
    }

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
        throw NotFound('Label does not exist!');
      }

      await label.removeRecipe(req.query.recipeId, {
        transaction
      });

      if (label.recipes.length === 1) {
        await label.destroy({transaction});

        return {}; // Label was deleted;
      } else {
        return label;
      }
    }).then(label => {
      res.status(200).json(label);
    });
  }));

// Update label for all associated recipes
router.put(
  '/:id',
  cors(),
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {

    if (typeof req.body.title === 'string' && UtilService.cleanLabelTitle(req.body.title).length === 0) {
      throw BadRequest('Label title must be longer than 0.');
    }

    const label = await SQ.transaction(async (transaction) => {
      const label = await Label.findOne({
        where: {
          id: req.params.id,
          userId: res.locals.session.userId
        },
        transaction
      });

      if (!label) {
        throw NotFound('Label with that ID does not exist!');
      }

      if (typeof req.body.title === 'string') label.title = UtilService.cleanLabelTitle(req.body.title);

      const labels = await Label.findAll({
        where: {
          id: { [Op.ne]: label.id },
          title: req.body.title,
          userId: res.locals.session.userId
        },
        transaction,
      });

      if (labels && labels.length > 0) {
        throw Conflict('Label with that title already exists!');
      }

      return await label.save({ transaction });
    });

    res.status(200).json(label);
  }));

// Delete labels from all associated recipes
router.post(
  '/delete-bulk',
  cors(),
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {

    if (!req.body.labelIds || !req.body.labelIds.length) {
      throw PreconditionFailed('LabelIds are required!');
    }

    await Label.destroy({
      where: {
        id: { [Op.in]: req.body.labelIds },
        userId: res.locals.session.userId
      }
    });

    res.status(200).send('ok');
  }));

module.exports = router;
