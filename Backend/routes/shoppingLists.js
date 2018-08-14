var express = require('express');
var router = express.Router();
var cors = require('cors');
var Raven = require('raven');

// DB
var mongoose = require('mongoose');
var ShoppingList = mongoose.model('ShoppingList');

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

  new ShoppingList({
    title: req.body.title,
    collaborators: req.body.collaborators || [],
    accountId: res.locals.accountId
  }).save(function (err, shoppingList) {
    if (err) {
      var payload = {
        msg: "Error saving shopping list!"
      };
      res.status(500).json(payload);
      payload.err = err;
      Raven.captureException(payload);
    } else {
      for (var i = 0; i < (req.body.collaborators || []).length; i++) {
        GripService.broadcast(req.body.collaborators[i], 'shoppingList:received', {
          shoppingList: shoppingList._id,
          from: {
            _id: res.locals.user._id,
            name: res.locals.user.name,
            email: res.locals.user.email
          }
        });
      }

      res.status(200).json(shoppingList);
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

    ShoppingList.find(query)
      .sort({ updated: -1 })
      .populate('collaborators', 'name email')
      .select('-items')
      .lean()
      .exec(function (err, shoppingLists) {
        if (err) {
          var payload = {
            msg: "Couldn't search the database for shopping lists!"
          };
          res.status(500).json(payload);
          payload.err = err;
          Raven.captureException(payload);
        } else {
          res.status(200).json(shoppingLists);
        }
      });
  });

// Add items to a shopping list
router.post(
  '/:shoppingListId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    var find = {
      $or: [
        { accountId: res.locals.accountId },
        { collaborators: res.locals.accountId }
      ],
      _id: req.params.shoppingListId
    };

    // All pending items in sterilized format
    var addItems = [];

    for (var i = 0; i < req.body.items.length; i++) {
      var item = {
        title: req.body.items[i].title,
        recipe: req.body.items[i].recipe || null,
        created: Date.now(),
        createdBy: res.locals.accountId,
        completed: false
      }

      addItems.push(item);
    }

    var update = {
      $push: { items: { $each: addItems } },
      updated: Date.now()
    };

    ShoppingList.findOneAndUpdate(find, update, { new: true })
    .populate('collaborators', 'name email')
    .populate('items.recipe', 'title')
    .exec(function (err, shoppingList) {
      if (err) {
        res.status(500).send("Couldn't update the database with shopping list!");
        Raven.captureException(err);
      } else if (!shoppingList) {
        res.status(404).send("Shopping list with that ID not found or you do not have access!");
      } else {
        for (var i = 0; i < shoppingList.collaborators.length; i++) {
          GripService.broadcast(shoppingList.collaborators[i], 'shoppingList:itemsUpdated', {
            shoppingList: shoppingList._id,
            updatedBy: {
              _id: res.locals.user._id,
              name: res.locals.user.name,
              email: res.locals.user.email
            }
          });
        }

        res.status(200).json(shoppingList);
      }
    });
  });

// Delete shopping list from account
router.delete(
  '/:shoppingListId/unlink',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    var query = {
      $or: [
        { accountId: res.locals.accountId },
        { collaborators: res.locals.accountId }
      ],
      _id: req.params.shoppingListId
    };

    ShoppingList.findOne(query)
      .exec(function (err, shoppingList) {
        if (err) {
          res.status(500).send("Couldn't search the database for recipe!");
        } else if (!shoppingList) {
          res.status(404).send("Recipe with that ID not found!");
        } else {
          if (shoppingList.accountId === res.locals.accountId) {
            recipe.remove(function (err) {
              if (err) {
                var payload = {
                  msg: "Couldn't delete recipe from database"
                };
                res.status(500).json(payload);
                payload.err = err;
                Raven.captureException(payload);
              } else {
                res.status(200).send('deleted');
              }
            });
          } else {
            var find = {
              _id: req.params.shoppingListId
            };

            var update = {
              $pull: { collaborators: res.locals.accountId },
              updated: Date.now()
            };

            ShoppingList.findOneAndUpdate(find, update, { new: true }, function (err, shoppingList) {
              if (err) {
                res.status(500).send("Couldn't search the database for shopping list!");
              } else if (!shoppingList) {
                res.status(404).send("Shopping list with that ID not found or you do not have access!");
              } else {
                res.status(200).send('deleted');
              }
            });
          }
        }
      });
  });

// Delete items from a shopping list, either by recipeId or by a list of items
router.delete(
  '/:shoppingListId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

    var find = {
      $or: [
        { accountId: res.locals.accountId },
        { collaborators: res.locals.accountId }
      ],
      _id: req.params.shoppingListId
    };

    var update;

    if (req.body.recipeId) {
      update = {
        $pull: { items: { recipeId: req.query.recipeId } }
      };
    } else {
      var items = req.query.items.split(',').map(function (el) {
        return mongoose.Types.ObjectId(el);
      });

      update = {
        $pull: { items: { _id: { $in: items } } }
      };
    }
    update.updated = Date.now();

    ShoppingList.findOneAndUpdate(find, update, { new: true })
    .populate('collaborators', 'name email')
    .populate('items.recipe', 'title')
    .exec(function(err, shoppingList) {
      if (err) {
        console.log(err)
        res.status(500).send("Couldn't search the database for shopping list!");
      } else if (!shoppingList) {
        res.status(404).send("Shopping list with that ID not found or you do not have access!");
      } else {
        for (var i = 0; i < shoppingList.collaborators.length; i++) {
          GripService.broadcast(shoppingList.collaborators[i], 'shoppingList:itemsUpdated', {
            shoppingList: shoppingList._id,
            updatedBy: {
              _id: res.locals.user._id,
              name: res.locals.user.name,
              email: res.locals.user.email
            }
          });
        }

        res.status(200).json(shoppingList);
      }
    });
  });

//Get a single shopping list
router.get(
  '/:shoppingListId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

    var query = {
      $or: [
        { accountId: res.locals.accountId },
        { collaborators: res.locals.accountId }
      ],
      _id: req.params.shoppingListId
    };

    ShoppingList.findOne(query)
    .populate('collaborators', 'name email')
    .populate('items.recipe', 'title')
    .lean()
    .exec(function(err, shoppingList) {
      if (err) {
        res.status(500).send("Couldn't search the database for recipe!");
      } else if (!shoppingList) {
        res.status(404).send("Recipe with that ID not found!");
      } else {
        res.status(200).json(shoppingList);
      }
    });
});

// Update a shopping list meta info (NOT INCLUDING ITEMS)
router.put(
  '/:shoppingListId',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res) {

  ShoppingList.findOne({
    _id: req.params.shoppingListId,
    accountId: res.locals.accountId
  }, function(err, shoppingList) {
    if (err) {
      res.status(500).json({
        msg: "Couldn't search the database for shopping list!"
      });
    } else if (!shoppingList) {
      res.status(404).json({
        msg: "Shopping list with that ID does not exist or you do not have access!"
      });
    } else {
      if (typeof req.body.title === 'string') shoppingList.title = req.body.title;
      if (req.body.collaborators) shoppingList.collaborators = req.body.collaborators;

      shoppingList.updated = Date.now();

      shoppingList.save(function (err, shoppingList) {
        if (err) {
          res.status(500).send("Could not save updated shopping list!");
        } else {
          res.status(200).json(shoppingList);
        }
      });
    }
  });
});

module.exports = router;
