const express = require('express');
const router = express.Router();
const sanitizeHtml = require('sanitize-html');

// DB
const Op = require('sequelize').Op;
const User = require('../models').User;
const Recipe = require('../models').Recipe;
const Image = require('../models').Image;
const Label = require('../models').Label;
const ShoppingList = require('../models').ShoppingList;
const ShoppingListItem = require('../models').ShoppingListItem;

// Service
const MiddlewareService = require('../services/middleware');
const UtilService = require('../services/util');
const ShoppingListCategorizerService = require('../services/shopping-list-categorizer.js');

// SharedUtils
const SharedUtils = require('../../../SharedUtils/src');

router.get('/', (req, res) => {
  let originalModifiers = req.query.modifiers ? req.query.modifiers.split(',') : [];

  let mappedModifiers = {
    titleImage: originalModifiers.indexOf('noimage') === -1 && req.query.template != 'compact',
    halfsheet: originalModifiers.indexOf('halfsheet') !== -1 || req.query.template == 'compact' || req.query.template == 'halfsheet',
  };

  let modifierQuery = Object.keys(mappedModifiers).filter(m => mappedModifiers[m]).map(modifier => `&${modifier}=true`).join('');

  res.redirect(302, `/api/print/${req.query.recipeId}?printPreview=true&version=legacy${modifierQuery}`);
});

router.get('/shoppingList/:shoppingListId',
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {

    try {
      if (!req.query.version) return res.status(400).send('Missing parameter: version');

      const modifiers = {
        version: req.query.version,
        groupCategories: req.query.groupCategories,
        groupSimilar: req.query.groupSimilar,
        sortBy: req.query.sortBy || '-title',
      };

      const shoppingListSummary = await ShoppingList.findOne({
        where: {
          id: req.params.shoppingListId,
          [Op.or]: [
            { userId: res.locals.session.userId },
            { '$collaborators.id$': res.locals.session.userId }
          ]
        },
        include: [{
          model: ShoppingListItem,
          as: 'items',
          attributes: ['title'],
        }, {
          model: User,
          as: 'collaborators',
          attributes: ['id']
        }]
      });

      if (!shoppingListSummary) {
        return res.render('error', {
          message: '404',
          error: {
            status: 'Shopping list not found',
            stack: ''
          }
        });
      }

      const shoppingList = shoppingListSummary.toJSON();
      ShoppingListCategorizerService.groupShoppingListItems(shoppingList.items);
      shoppingList.items.forEach(item => item.categoryTitle = ShoppingListCategorizerService.getCategoryTitle(item.title));

      const {
        items,
        groupTitles,
        categoryTitles,
        itemsByGroupTitle,
        itemsByCategoryTitle,
        groupsByCategoryTitle,
      } = SharedUtils.getShoppingListItemGroupings(shoppingList.items, modifiers.sortBy);

      res.render('shoppinglist-default', {
        title: shoppingList.title,
        items,
        groupTitles,
        categoryTitles,
        itemsByGroupTitle,
        itemsByCategoryTitle,
        groupsByCategoryTitle,
        date: (new Date).toDateString(),
        modifiers,
      });
    } catch(e) {
      next(e);
    }
  });

router.get('/:recipeId',
  MiddlewareService.validateSession(['user'], true),
  function (req, res, next) {

    if (!req.query.version) return res.status(400).send('Missing parameter: version');

    const modifiers = {
      version: req.query.version,
      halfsheet: !!req.query.halfsheet,
      twocolIngr: !!req.query.twocolIngr,
      verticalInstrIng: !!req.query.verticalInstrIng,
      titleImage: !!req.query.titleImage,
      hideNotes: !!req.query.hideNotes,
      hideSource: !!req.query.hideSource,
      hideSourceURL: !!req.query.hideSourceURL,
      printPreview: !!req.query.printPreview,
      showPrintButton: !!req.query.showPrintButton,
      scale: parseFloat(req.query.scale || 1, 10),
    };

    Recipe.findOne({
      where: {
        id: req.params.recipeId
      },
      include: [
        {
          model: Label,
          as: 'labels'
        },
        {
          model: Image,
          as: 'images'
        }
      ]
    }).then(function(rObj) {
      if (!rObj) {
        res.render('error', {
          message: '404',
          error: {
            status: 'Recipe not found',
            stack: ''
          }
        });
      } else {
        let recipe = rObj.toJSON();

        recipe = UtilService.sortRecipeImages(rObj);

        recipe.isOwner = res.locals.session ? res.locals.session.userId == recipe.userId : false;

        // There should be no fromUser after recipes have been moved out of the inbox
        if (recipe.folder !== 'inbox' || !recipe.isOwner) delete recipe.fromUser;

        if (!recipe.isOwner) recipe.labels = [];

        recipe.instructions = SharedUtils.parseInstructions(sanitizeHtml(recipe.instructions));
        recipe.ingredients = SharedUtils.parseIngredients(sanitizeHtml(recipe.ingredients), modifiers.scale, true);
        recipe.notes = SharedUtils.parseNotes(sanitizeHtml(recipe.notes));

        if (!modifiers.titleImage) {
          recipe.images = [];
        }

        res.render('recipe-default', {
          recipe: recipe,
          recipeURL: `https://recipesage.com/#/recipe/${recipe.id}`,
          date: (new Date).toDateString(),
          modifiers: modifiers
        });
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
