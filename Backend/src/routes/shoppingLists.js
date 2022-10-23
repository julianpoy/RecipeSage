const express = require('express');
const router = express.Router();
const cors = require('cors');
const joi = require('joi');

// DB
const Op = require("sequelize").Op;
const SQ = require('../models').sequelize;
const User = require('../models').User;
const Recipe = require('../models').Recipe;
const Message = require('../models').Message;
const Label = require('../models').Label;
const MealPlanItem = require('../models').MealPlanItem;
const ShoppingList = require('../models').ShoppingList;
const ShoppingListItem = require('../models').ShoppingListItem;

// Service
const MiddlewareService = require('../services/middleware');
const UtilService = require('../services/util');
const GripService = require('../services/grip');
const SharedUtils = require('../../../SharedUtils/src');
const ShoppingListCategorizerService = require('../services/shopping-list-categorizer.js');
const {joiValidator} = require('../middleware/joiValidator');

router.post(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

  SQ.transaction(function (t) {
    return ShoppingList.create({
      title: req.body.title,
      userId: res.locals.session.userId
    }, {
      transaction: t
    }).then(function(shoppingList) {
      return shoppingList.addCollaborators(
        req.body.collaborators || [],
        {
          transaction: t
        }
      ).then(() => {
        for (var i = 0; i < (req.body.collaborators || []).length; i++) {
          GripService.broadcast(req.body.collaborators[i], 'shoppingList:received', {
            shoppingListId: shoppingList.id,
            from: {
              id: res.locals.user.id,
              name: res.locals.user.name,
              email: res.locals.user.email
            }
          });
        }

        res.status(200).json(shoppingList);
      });
    });
  }).catch(next);
});

router.get(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {

    try {
      const shoppingListIds = (await ShoppingList.findAll({
        where: {
          [Op.or]: [
            { userId: res.locals.session.userId },
            { '$collaborators.id$': res.locals.session.userId }
          ]
        },
        include: [{
          model: User,
          as: 'collaborators',
          attributes: ['id']
        }],
        attributes: ['id']
      })).map(result => result.id);

      const shoppingLists = await ShoppingList.findAll({
        where: {
          id: shoppingListIds
        },
        include: [
          {
            model: User,
            as: 'collaborators',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email']
          },
          {
            model: ShoppingListItem,
            as: 'items',
            attributes: []
          }
        ],
        attributes: ['id', 'title', 'createdAt', 'updatedAt', [SQ.fn('COUNT', SQ.col('items.id')), 'itemCount']],
        group: ['ShoppingList.id', 'collaborators.id', 'collaborators->ShoppingList_Collaborator.id', 'owner.id'],
        order: [
          ['updatedAt', 'DESC']
        ]
      });

      let s = shoppingLists.map(function(list) {
        let l = list.dataValues;
        l.myUserId = res.locals.session.userId;

        return l;
      });

      res.status(200).json(s);
    } catch (e) {
      next(e);
    }
  });

// Add items to a shopping list
router.post(
  '/:shoppingListId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    ShoppingList.findOne({
      where: {
        id: req.params.shoppingListId,
        [Op.or]: [
          { userId: res.locals.session.userId },
          { '$collaborators.id$': res.locals.session.userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'collaborators',
          attributes: ['id']
        }
      ]
    }).then(function(shoppingList) {
      if (!shoppingList) {
        res.status(404).send("Shopping list with that ID not found or you do not have access!");
      } else {
        return SQ.transaction(function(t) {
          return ShoppingListItem.bulkCreate(req.body.items.map((item) => {
            return {
              title: item.title,
              completed: item.completed || false,
              userId: res.locals.session.userId,
              shoppingListId: shoppingList.id,
              recipeId: item.recipeId || null,
              mealPlanItemId: item.mealPlanItemId || null
            }
          }), { transaction: t }).then(function() {
            let reference = Date.now();

            var broadcastPayload = {
              shoppingListId: shoppingList.id,
              updatedBy: {
                id: res.locals.user.id,
                name: res.locals.user.name,
                email: res.locals.user.email
              },
              reference
            };

            GripService.broadcast(shoppingList.userId, 'shoppingList:itemsUpdated', broadcastPayload);
            for (var i = 0; i < shoppingList.collaborators.length; i++) {
              GripService.broadcast(shoppingList.collaborators[i].id, 'shoppingList:itemsUpdated', broadcastPayload);
            }

            res.status(200).json({
              reference
            });
          });
        });
      }
    }).catch(next);
  });

// Delete shopping list from account
router.delete(
  '/:shoppingListId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    ShoppingList.findOne({
      where: {
        id: req.params.shoppingListId,
        [Op.or]: [
          { userId: res.locals.session.userId },
          { '$collaborators.id$': res.locals.session.userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'collaborators',
          attributes: ['id']
        }
      ]
    }).then(function(shoppingList) {
      if (!shoppingList) {
        res.status(404).send("Shopping list not found or not visible to you!");
      } else {
        if (shoppingList.userId === res.locals.session.userId) {
          return shoppingList.destroy().then(function () {
            for (var i = 0; i < (shoppingList.collaborators || []).length; i++) {
              GripService.broadcast(shoppingList.collaborators[i], 'shoppingList:removed', {
                shoppingListId: shoppingList.id,
                updatedBy: {
                  id: res.locals.user.id,
                  name: res.locals.user.name,
                  email: res.locals.user.email
                }
              });
            }

            res.status(200).json({});
          });
        } else {
          return shoppingList.removeCollaborator(res.locals.session.userId).then(function() {
            res.status(200).json({});
          });
        }
      }
    }).catch(next);
  });

// Delete items from a shopping list by a list of item ids
router.delete(
  '/:shoppingListId/items',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    // items for legacy, itemIds as replacement
    const itemIds = (req.query.items || req.query.itemIds).split(',');

    ShoppingList.findOne({
      where: {
        id: req.params.shoppingListId,
        [Op.or]: [
          { userId: res.locals.session.userId },
          { '$collaborators.id$': res.locals.session.userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'collaborators',
          attributes: ['id']
        }
      ]
    }).then(function(shoppingList) {
      if (shoppingList) {
        return ShoppingListItem.destroy({
          where: {
            id: {
              [Op.in]: itemIds
            }
          }
        }).then(function() {
          let reference = Date.now();

          var deletedItemBroadcast = {
            shoppingListId: shoppingList.id,
            updatedBy: {
              id: res.locals.user.id,
              name: res.locals.user.name,
              email: res.locals.user.email
            },
            reference
          };

          GripService.broadcast(shoppingList.userId, 'shoppingList:itemsUpdated', deletedItemBroadcast);
          for (var i = 0; i < shoppingList.collaborators.length; i++) {
            GripService.broadcast(shoppingList.collaborators[i].id, 'shoppingList:itemsUpdated', deletedItemBroadcast);
          }

          res.status(200).json({
            reference
          });
        });
      } else {
        res.status(404).send('Shoppinglist does not exist or you do not have access');
      }
    }).catch(next);
  });

//Get a single shopping list
router.get(
  '/:shoppingListId',
  cors(),
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {

    try {
      const shoppingList = await ShoppingList.findOne({
        where: {
          id: req.params.shoppingListId,
          [Op.or]: [
            { userId: res.locals.session.userId },
            { '$collaborators.id$': res.locals.session.userId }
          ]
        },
        include: [{
          model: User,
          as: 'collaborators',
          attributes: ['id']
        }]
      });

      if (!shoppingList) {
        return res.status(404).send("Recipe with that ID not found!");
      }

      const shoppingListSummary = await ShoppingList.findOne({
        where: {
          id: shoppingList.id
        },
        include: [{
          model: User,
          as: 'collaborators',
          attributes: ['id', 'name', 'email']
        }, {
          model: User,
          as: 'owner',
          attributes: ['id', 'name', 'email']
        }, {
          model: ShoppingListItem,
          as: 'items',
          attributes: ['id', 'title', 'completed', 'createdAt', 'updatedAt'],
          include: [{
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email']
          }, {
            model: MealPlanItem,
            as: 'mealPlanItem',
            attributes: ['id', 'title']
          }, {
            model: Recipe,
            as: 'recipe',
            attributes: ['id', 'title']
          }]
        }]
      });

      let s = shoppingListSummary.toJSON();
      ShoppingListCategorizerService.groupShoppingListItems(s.items);
      s.items.forEach(item => item.categoryTitle = ShoppingListCategorizerService.getCategoryTitle(item.title));

      res.status(200).json(s);
    } catch (e) {
      next(e);
    }
});

// Update a shopping list meta info (NOT INCLUDING ITEMS)
// router.put(
//   '/:shoppingListId',
//   cors(),
//   MiddlewareService.validateSession(['user']),
//   function(req, res, next) {

//   let updates = {};

//   if (typeof req.body.title === 'string') updates.title = req.body.title;
//   if (req.body.collaborators) updates.collaborators = req.body.collaborators;

//   ShoppingList.update(updates, {
//     id: req.params.shoppingListId,
//     userId: res.locals.session.userId
//   }, function(shoppingList) {
//     if (!shoppingList) {
//       res.status(404).json({
//         msg: "Shopping list with that ID does not exist or you do not have access!"
//       });
//     } else {
//       res.status(200).json({});
//     }
//   }).catch(next);
// });

// Update items from a shopping list by a list of item ids
router.put(
  '/:shoppingListId/items',
  joiValidator(joi.object({
    params: joi.object({
      shoppingListId: joi.string().required().uuid(),
    }),
    query: joi.object({
      itemIds: joi.string().required()
    }),
    body: joi.object({
      title: joi.string().min(1),
      completed: joi.boolean(),
    }),
  })),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  async (req, res, next) => {

    try {
      const shoppingList = await ShoppingList.findOne({
        where: {
          id: req.params.shoppingListId,
          [Op.or]: [
            { userId: res.locals.session.userId },
            { '$collaborators.id$': res.locals.session.userId }
          ]
        },
        include: [
          {
            model: User,
            as: 'collaborators',
            attributes: ['id']
          }
        ]
      });

      if (!shoppingList) res.status(404).send('Shoppinglist does not exist or you do not have access');

      await ShoppingListItem.update({
        ...req.body
      }, {
        where: {
          id: {
            [Op.in]: req.query.itemIds.split(','),
          }
        }
      });

      const reference = Date.now();

      const broadcast = {
        shoppingListId: shoppingList.id,
        updatedBy: {
          id: res.locals.user.id,
          name: res.locals.user.name,
          email: res.locals.user.email
        },
        reference
      };

      GripService.broadcast(shoppingList.userId, 'shoppingList:itemsUpdated', broadcast);
      for (var i = 0; i < shoppingList.collaborators.length; i++) {
        GripService.broadcast(shoppingList.collaborators[i].id, 'shoppingList:itemsUpdated', broadcast);
      }

      res.status(200).json({
        reference
      });
    } catch(e) {
      next(e);
    }
  }
);

module.exports = router;
