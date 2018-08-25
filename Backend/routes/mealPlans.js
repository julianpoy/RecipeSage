var express = require('express');
var router = express.Router();
var cors = require('cors');
var Raven = require('raven');

// DB
var mongoose = require('mongoose');
var MealPlan = mongoose.model('MealPlan');

// Service
var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');
var GripService = require('../services/grip');

router.post(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

  new MealPlan({
    title: req.body.title,
    collaborators: req.body.collaborators || [],
    accountId: res.locals.accountId
  }).save(function (err, mealPlan) {
    if (err) {
      var payload = {
        msg: "Error saving meal plan!"
      };
      res.status(500).json(payload);
      payload.err = err;
      Raven.captureException(payload);
    } else {
      for (var i = 0; i < (req.body.collaborators || []).length; i++) {
        GripService.broadcast(req.body.collaborators[i], 'mealPlan:received', {
          mealPlanId: mealPlan._id,
          from: {
            _id: res.locals.user._id,
            name: res.locals.user.name,
            email: res.locals.user.email
          }
        });
      }

      res.status(200).json(mealPlan);
    }
  });
});

router.get(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    var query = {
      $or: [
        { accountId: res.locals.accountId },
        { collaborators: res.locals.accountId }
      ]
    }

    MealPlan.find(query)
      .sort({ updated: -1 })
      .populate('collaborators', 'name email')
      .populate('accountId', 'name email')
      .lean()
      .exec(function (err, mealPlans) {
        if (err) {
          var payload = {
            msg: "Couldn't search the database for meal plans!"
          };
          res.status(500).json(payload);
          payload.err = err;
          Raven.captureException(payload);
        } else {
          for (var i = 0; i < mealPlans.length; i++) {
            mealPlans[i].myUserId = res.locals.accountId;
            mealPlans[i].itemCount = (mealPlans[i].items || []).length;
            delete mealPlans[i].items;
          }

          res.status(200).json(mealPlans);
        }
      });
  });

// Add items to a meal plan
router.post(
  '/:mealPlanId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    var find = {
      $or: [
        { accountId: res.locals.accountId },
        { collaborators: res.locals.accountId }
      ],
      _id: req.params.mealPlanId
    };

    var item = {
      title: req.body.title,
      recipe: req.body.recipe || null,
      date: new Date(req.body.date),
      created: Date.now(),
      createdBy: res.locals.accountId
    }

    var update = {
      $push: { items: { $each: [item] } },
      updated: Date.now()
    };

    MealPlan.findOneAndUpdate(find, update, { new: true })
    .populate('collaborators', 'name email')
    .populate('items.createdBy', 'name email')
    .populate('items.recipe', 'title')
    .lean()
    .exec(function (err, mealPlan) {
      if (err) {
        res.status(500).send("Couldn't update the database with meal plan!");
        Raven.captureException(err);
      } else if (!mealPlan) {
        res.status(404).send("Meal plan with that ID not found or you do not have access!");
      } else {
        var broadcastPayload = {
          mealPlanId: mealPlan._id,
          updatedBy: {
            _id: res.locals.user._id,
            name: res.locals.user.name,
            email: res.locals.user.email
          }
        };

        GripService.broadcast(mealPlan.accountId, 'mealPlan:itemsUpdated', broadcastPayload);
        for (var i = 0; i < mealPlan.collaborators.length; i++) {
          GripService.broadcast(mealPlan.collaborators[i]._id, 'mealPlan:itemsUpdated', broadcastPayload);
        }

        res.status(200).json(mealPlan);
      }
    });
  });

// Delete meal plan from account
router.delete(
  '/:mealPlanId/unlink',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    var query = {
      $or: [
        { accountId: res.locals.accountId },
        { collaborators: res.locals.accountId }
      ],
      _id: req.params.mealPlanId
    };

    MealPlan.findOne(query)
      .exec(function (err, mealPlan) {
        if (err) {
          res.status(500).send("Couldn't search the database for meal plan!");
          Raven.captureException(err);
        } else if (!mealPlan) {
          res.status(404).send("Meal plan not found or not visible to you!");
        } else {
          if (mealPlan.accountId === res.locals.accountId) {
            mealPlan.remove(function (err) {
              if (err) {
                var payload = {
                  msg: "Couldn't delete meal plan from database"
                };
                res.status(500).json(payload);
                payload.err = err;
                Raven.captureException(payload);
              } else {
                for (var i = 0; i < (mealPlan.collaborators || []).length; i++) {
                  GripService.broadcast(mealPlan.collaborators[i], 'mealPlan:removed', {
                    mealPlanId: mealPlan._id,
                    updatedBy: {
                      _id: res.locals.user._id,
                      name: res.locals.user.name,
                      email: res.locals.user.email
                    }
                  });
                }

                res.status(200).send(mealPlan);
              }
            });
          } else {
            var find = {
              _id: req.params.mealPlanId
            };

            var update = {
              $pull: { collaborators: res.locals.accountId },
              updated: Date.now()
            };

            MealPlan.findOneAndUpdate(find, update, { new: true }, function (err, mealPlan) {
              if (err) {
                res.status(500).send("Couldn't search the database for meal plan!");
              } else if (!mealPlan) {
                res.status(404).send("Meal plan with that ID not found or you do not have access!");
              } else {
                res.status(200).send(mealPlan);
              }
            });
          }
        }
      });
  });

// Delete items from a meal plan, either by recipeId or by itemId
router.delete(
  '/:mealPlanId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    var find = {
      $or: [
        { accountId: res.locals.accountId },
        { collaborators: res.locals.accountId }
      ],
      _id: req.params.mealPlanId
    };

    var update;

    if (req.body.recipeId) {
      update = {
        $pull: { items: { recipeId: req.query.recipeId } }
      };
    } else {
      update = {
        $pull: { items: { _id: { $in: [req.query.itemId] } } }
      };
    }
    update.updated = Date.now();

    MealPlan.findOneAndUpdate(find, update, { new: true })
    .populate('collaborators', 'name email')
    .populate('items.createdBy', 'name email')
    .populate('items.recipe', 'title')
    .lean()
    .exec(function(err, mealPlan) {
      if (err) {
        console.log(err)
        res.status(500).send("Couldn't search the database for meal plan!");
      } else if (!mealPlan) {
        res.status(404).send("Meal plan with that ID not found or you do not have access!");
      } else {
        var deletedItemBroadcast = {
          mealPlanId: mealPlan._id,
          updatedBy: {
            _id: res.locals.user._id,
            name: res.locals.user.name,
            email: res.locals.user.email
          }
        };

        GripService.broadcast(mealPlan.accountId, 'mealPlan:itemsUpdated', deletedItemBroadcast);
        for (var i = 0; i < mealPlan.collaborators.length; i++) {
          GripService.broadcast(mealPlan.collaborators[i]._id, 'mealPlan:itemsUpdated', deletedItemBroadcast);
        }

        res.status(200).json(mealPlan);
      }
    });
  });

//Get a single meal plan
router.get(
  '/:mealPlanId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

    var query = {
      $or: [
        { accountId: res.locals.accountId },
        { collaborators: res.locals.accountId }
      ],
      _id: req.params.mealPlanId
    };

    MealPlan.findOne(query)
    .populate('collaborators', 'name email')
    .populate('items.createdBy', 'name email')
    .populate('items.recipe', 'title')
    .lean()
    .exec(function(err, mealPlan) {
      if (err) {
        res.status(500).send("Couldn't search the database for recipe!");
      } else if (!mealPlan) {
        res.status(404).send("Recipe with that ID not found!");
      } else {
        res.status(200).json(mealPlan);
      }
    });
});

// Update a meal plan meta info (NOT INCLUDING ITEMS)
router.put(
  '/:mealPlanId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res) {

  MealPlan.findOne({
    _id: req.params.mealPlanId,
    accountId: res.locals.accountId
  }, function(err, mealPlan) {
    if (err) {
      res.status(500).json({
        msg: "Couldn't search the database for meal plan!"
      });
    } else if (!mealPlan) {
      res.status(404).json({
        msg: "Meal plan with that ID does not exist or you do not have access!"
      });
    } else {
      if (typeof req.body.title === 'string') mealPlan.title = req.body.title;
      if (req.body.collaborators) mealPlan.collaborators = req.body.collaborators;

      mealPlan.updated = Date.now();

      mealPlan.save(function (err, mealPlan) {
        if (err) {
          res.status(500).send("Could not save updated meal plan!");
        } else {
          res.status(200).json(mealPlan);
        }
      });
    }
  });
});

module.exports = router;
