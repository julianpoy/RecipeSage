const express = require('express');
const router = express.Router();
const cors = require('cors');
const ical = require('ical-generator');

// DB
const Op = require('sequelize').Op;
const SQ = require('../models').sequelize;
const User = require('../models').User;
const Recipe = require('../models').Recipe;
const Image = require('../models').Image;
const MealPlan = require('../models').MealPlan;
const MealPlanItem = require('../models').MealPlanItem;
const ShoppingList = require('../models').ShoppingList;
const ShoppingListItem = require('../models').ShoppingListItem;

// Service
const MiddlewareService = require('../services/middleware');
const GripService = require('../services/grip');

router.post(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    SQ.transaction((t) => {
      return MealPlan.create({
        title: req.body.title,
        userId: res.locals.session.userId
      }, {
        transaction: t
      }).then(function(mealPlan) {
        return mealPlan.addCollaborators(
          req.body.collaborators || [],
          {
            transaction: t
          }
        ).then(() => {
          for (var i = 0; i < (req.body.collaborators || []).length; i++) {
            GripService.broadcast(req.body.collaborators[i], 'mealPlan:received', {
              mealPlanId: mealPlan.id,
              from: {
                id: res.locals.user.id,
                name: res.locals.user.name,
                email: res.locals.user.email
              }
            });
          }

          res.status(200).json(mealPlan);
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
      const mealPlanIds = (await MealPlan.findAll({
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

      const mealPlans = await MealPlan.findAll({
        where: {
          id: mealPlanIds
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
            model: MealPlanItem,
            as: 'items',
            attributes: []
          }
        ],
        attributes: ['id', 'title', 'createdAt', 'updatedAt', [SQ.fn('COUNT', SQ.col('items.id')), 'itemCount']],
        group: ['MealPlan.id', 'collaborators.id', 'collaborators->MealPlan_Collaborator.id', 'owner.id'],
        order: [
          ['updatedAt', 'DESC']
        ]
      });

      let mp = mealPlans.map(plan => {
        let p = plan.dataValues;
        p.myUserId = res.locals.session.userId;

        return p;
      });

      res.status(200).json(mp);
    } catch (e) {
      next(e);
    }
  });

// Add items to a meal plan
router.post(
  '/:mealPlanId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    MealPlan.findOne({
      where: {
        id: req.params.mealPlanId,
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
    }).then(function (mealPlan) {
      if (!mealPlan) {
        res.status(404).send('Meal plan with that ID not found or you do not have access!');
      } else {
        return MealPlanItem.create({
          title: req.body.title,
          scheduled: new Date(req.body.scheduled),
          meal: req.body.meal,
          recipeId: req.body.recipeId || null,
          userId: res.locals.session.userId,
          mealPlanId: mealPlan.id
        }).then(function() {
          let reference = Date.now();

          var broadcastPayload = {
            mealPlanId: mealPlan.id,
            updatedBy: {
              id: res.locals.user.id,
              name: res.locals.user.name,
              email: res.locals.user.email
            },
            reference
          };

          GripService.broadcast(mealPlan.userId, 'mealPlan:itemsUpdated', broadcastPayload);
          for (var i = 0; i < mealPlan.collaborators.length; i++) {
            GripService.broadcast(mealPlan.collaborators[i].id, 'mealPlan:itemsUpdated', broadcastPayload);
          }

          res.status(200).json({
            reference
          });
        });
      }
    }).catch(next);
  });

// Delete meal plan from account
router.delete(
  '/:mealPlanId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    MealPlan.findOne({
      where: {
        id: req.params.mealPlanId,
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
    }).then(function (mealPlan) {
      if (!mealPlan) {
        res.status(404).send('Meal plan not found or not visible to you!');
      } else {
        if (mealPlan.userId === res.locals.session.userId) {
          return mealPlan.destroy().then(() => {
            for (var i = 0; i < (mealPlan.collaborators || []).length; i++) {
              GripService.broadcast(mealPlan.collaborators[i], 'mealPlan:removed', {
                mealPlanId: mealPlan.id,
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
          return MealPlan.removeCollaborator(res.locals.session.userId).then(function () {
            res.status(200).json({});
          });
        }
      }
    }).catch(next);
  });

// Delete items from a meal plan, either by recipeId or by itemId
router.delete(
  '/:mealPlanId/items',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    MealPlan.findOne({
      where: {
        id: req.params.mealPlanId,
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
    }).then(function (mealPlan) {
      if (mealPlan) {
        return MealPlanItem.destroy({
          where: {
            id: req.query.itemId,
            mealPlanId: mealPlan.id
          }
        }).then(function () {
          let reference = Date.now();

          var deletedItemBroadcast = {
            mealPlanId: mealPlan.id,
            updatedBy: {
              id: res.locals.user.id,
              name: res.locals.user.name,
              email: res.locals.user.email
            },
            reference
          };

          GripService.broadcast(mealPlan.userId, 'mealPlan:itemsUpdated', deletedItemBroadcast);
          for (var i = 0; i < mealPlan.collaborators.length; i++) {
            GripService.broadcast(mealPlan.collaborators[i].id, 'mealPlan:itemsUpdated', deletedItemBroadcast);
          }

          res.status(200).json({
            reference
          });
        });
      } else {
        res.status(404).send('Meal plan does not exist or you do not have access');
      }
    }).catch(next);
  });

// Update items from a meal plan in bulk
router.put(
  '/:mealPlanId/items/bulk',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  async (req, res, next) => {

    SQ.transaction(async transaction => {
      const mealPlan = await MealPlan.findOne({
        where: {
          id: req.params.mealPlanId,
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
        ],
        transaction
      });

      if (!mealPlan) return res.status(404).send('Meal plan does not exist or you do not have access');

      for (let i = 0; i < req.body.items.length; i++) {
        const item = req.body.items[i];

        await MealPlanItem.update({
          title: item.title,
          recipeId: item.recipeId || null,
          meal: item.meal,
          scheduled: item.scheduled
        }, {
          where: {
            id: item.id,
            mealPlanId: mealPlan.id
          },
          transaction
        });
      }

      let reference = Date.now();

      var updateBroadcast = {
        mealPlanId: mealPlan.id,
        updatedBy: {
          id: res.locals.user.id,
          name: res.locals.user.name,
          email: res.locals.user.email
        },
        reference
      };

      GripService.broadcast(mealPlan.userId, 'mealPlan:itemsUpdated', updateBroadcast);
      for (var i = 0; i < mealPlan.collaborators.length; i++) {
        GripService.broadcast(mealPlan.collaborators[i].id, 'mealPlan:itemsUpdated', updateBroadcast);
      }

      res.status(200).json({
        reference
      });
    }).catch(next);
  });

// Update items from a meal plan in bulk
router.post(
  '/:mealPlanId/items/bulk',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  async (req, res, next) => {

    SQ.transaction(async transaction => {
      const mealPlan = await MealPlan.findOne({
        where: {
          id: req.params.mealPlanId,
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
        ],
        transaction
      });

      if (!mealPlan) return res.status(404).send('Meal plan does not exist or you do not have access');

      await MealPlanItem.bulkCreate(req.body.items.map(item => ({
        userId: res.locals.session.userId,
        mealPlanId: mealPlan.id,
        title: item.title,
        recipeId: item.recipeId || null,
        meal: item.meal,
        scheduled: item.scheduled
      })), {
        transaction
      });

      let reference = Date.now();

      var updateBroadcast = {
        mealPlanId: mealPlan.id,
        updatedBy: {
          id: res.locals.user.id,
          name: res.locals.user.name,
          email: res.locals.user.email
        },
        reference
      };

      GripService.broadcast(mealPlan.userId, 'mealPlan:itemsUpdated', updateBroadcast);
      for (var i = 0; i < mealPlan.collaborators.length; i++) {
        GripService.broadcast(mealPlan.collaborators[i].id, 'mealPlan:itemsUpdated', updateBroadcast);
      }

      res.status(200).json({
        reference
      });
    }).catch(next);
  });

router.delete(
  '/:mealPlanId/items/bulk',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  async (req, res, next) => {

    SQ.transaction(async transaction => {
      const mealPlan = await MealPlan.findOne({
        where: {
          id: req.params.mealPlanId,
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
        ],
        transaction
      });

      if (!mealPlan) return res.status(404).send('Meal plan does not exist or you do not have access');

      const mealPlanItemIds = req.query.itemIds.split(',');
      if (!mealPlanItemIds || mealPlanItemIds.length === 0) return res.status(400).send('Must provide itemIds');

      await MealPlanItem.destroy({
        where: {
          id: mealPlanItemIds,
          mealPlanId: mealPlan.id
        },
        transaction
      });

      let reference = Date.now();

      var updateBroadcast = {
        mealPlanId: mealPlan.id,
        updatedBy: {
          id: res.locals.user.id,
          name: res.locals.user.name,
          email: res.locals.user.email
        },
        reference
      };

      GripService.broadcast(mealPlan.userId, 'mealPlan:itemsUpdated', updateBroadcast);
      for (var i = 0; i < mealPlan.collaborators.length; i++) {
        GripService.broadcast(mealPlan.collaborators[i].id, 'mealPlan:itemsUpdated', updateBroadcast);
      }

      res.status(200).json({
        reference
      });
    }).catch(next);
  });

//Get a single meal plan
router.get(
  '/:mealPlanId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  async (req, res, next) => {

    try {
      const mealPlan = await MealPlan.findOne({
        where: {
          id: req.params.mealPlanId,
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

      if (!mealPlan) {
        return res.status(404).send('Meal plan with that ID not found or you do not have access!');
      }

      const mealPlanSummary = await MealPlan.findOne({
        where: {
          id: mealPlan.id
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
          model: MealPlanItem,
          as: 'items',
          attributes: ['id', 'title', 'scheduled', 'meal', 'createdAt', 'updatedAt'],
          include: [{
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email']
          }, {
            model: ShoppingListItem,
            as: 'shoppingListItems',
            attributes: ['id', 'title'],
            include: [{
              model: ShoppingList,
              as: 'shoppingList',
              attributes: ['id', 'title']
            }]
          }, {
            model: Recipe,
            as: 'recipe',
            attributes: ['id', 'title', 'ingredients'],
            include: [{
              model: Image,
              as: 'images',
              attributes: ['id', 'location']
            }]
          }]
        }]
      });

      res.status(200).json(mealPlanSummary);
    } catch (e) {
      next(e);
    }
  });

// Get ical for meal plan
router.get(
  '/:mealPlanId/ical',
  cors(),
  async (req, res, next) => {

    try {
      const mealPlan = await MealPlan.findOne({
        where: {
          id: req.params.mealPlanId
        },
        include: [{
          model: MealPlanItem,
          as: 'items',
          attributes: ['id', 'title', 'scheduled', 'meal', 'createdAt', 'updatedAt'],
          include: [{
            model: Recipe,
            as: 'recipe',
            attributes: ['id', 'title', 'ingredients'],
          }]
        }]
      });

      if (!mealPlan) {
        return res.status(404).send('Meal plan not found');
      }

      const icalEvents = mealPlan.items.map(item => ({
        start: new Date(item.scheduled),
        allDay: true,
        summary: item.recipe?.title || item.title,
        url: `https://recipesage.com/#/meal-planners/${mealPlan.id}`,
      }));

      const mealPlanICal = ical({
        name: `RecipeSage ${mealPlan.title}`,
        events: icalEvents,
      });

      mealPlanICal.serve(res);
    } catch (e) {
      next(e);
    }
  });

// Update a meal plan meta info (NOT INCLUDING ITEMS)
// router.put(
//   '/:mealPlanId',
//   cors(),
//   MiddlewareService.validateSession(['user']),
//   MiddlewareService.validateUser,
//   function(req, res) {

//   MealPlan.findOne({
//     _id: req.params.mealPlanId,
//     accountId: res.locals.accountId
//   }, function(err, mealPlan) {
//     if (err) {
//       res.status(500).json({
//         msg: "Couldn't search the database for meal plan!"
//       });
//     } else if (!mealPlan) {
//       res.status(404).json({
//         msg: "Meal plan with that ID does not exist or you do not have access!"
//       });
//     } else {
//       if (typeof req.body.title === 'string') mealPlan.title = req.body.title;
//       if (req.body.collaborators) mealPlan.collaborators = req.body.collaborators;

//       mealPlan.updated = Date.now();

//       mealPlan.save(function (err, mealPlan) {
//         if (err) {
//           res.status(500).send("Could not save updated meal plan!");
//         } else {
//           res.status(200).json(mealPlan);
//         }
//       });
//     }
//   });
// });

module.exports = router;
