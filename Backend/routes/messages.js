var express = require('express');
var router = express.Router();
var cors = require('cors');
var Raven = require('raven');

// DB
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Recipe = mongoose.model('Recipe');
var Label = mongoose.model('Label');
var Message = mongoose.model('Message');

// Service
var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');

router.post(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {
  
  console.log(req.body.to)
  User.findById(req.body.to).exec(function(err, recipient) {
    if (err) {
      var payload = {
        msg: 'Could not search DB for user.'
      };
      res.status(500).json(payload);
      payload.err = err;
      Raven.captureException(payload);
    } else if (!recipient) {
      res.status(404).send('Could not find user under that ID.');
    } else {
      function shareRecipeStep() {
        UtilService.shareRecipe(req.body.recipeId, res.locals.session.accountId, req.body.to, function(sharedRecipe) {
          createMessageStep(sharedRecipe._id);
        }, function(status, message) {
          res.status(status).send(message);
        });
      }
  
      function createMessageStep(sharedRecipeId) {
        new Message({
          from: res.locals.session.accountId,
          to: req.body.to,
          body: req.body.body,
          recipe: sharedRecipeId,
          originalRecipe: req.body.recipeId
        }).save(function(err, message) {
          if (err) {
            var payload = {
              msg: "Error saving recipe!"
            };
            res.status(500).json(payload);
            payload.err = err;
            Raven.captureException(payload);
          } else {
            message.populate('to from', 'name email', function(err, message) {
              if (err) {
                var payload = {
                  msg: "Error populating message to/from!"
                };
                res.status(500).json(payload);
                payload.err = err;
                Raven.captureException(payload);
              } else {
                message.populate('recipe originalRecipe', function(err, message) {
                  if (err) {
                    var payload = {
                      msg: "Error populating message recipe!"
                    };
                    res.status(500).json(payload);
                    payload.err = err;
                    Raven.captureException(payload);
                  } else {
                    message = message.toObject();
                    
                    // For sender (just sent)
                    message.otherUser = message.to;
                    res.status(201).json(message);
                    
                    // Alert for recipient (now receiving via notification)
                    message.otherUser = message.from;

                    UtilService.dispatchMessageNotification(recipient, message);
                  }
                });
              }
            });
          }
        });
      }

      if (req.body.recipeId) {
        shareRecipeStep();
      } else {
        createMessageStep();
      }
    }
  });
  
});

//Get all of a user's threads
router.get(
  '/threads',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

  var query = {
    $or: [
      { to: res.locals.session.accountId },
      { from: res.locals.session.accountId }
    ]
  }

  Message.find(query)
  .sort('-created')
  .populate('to', 'name email')
  .populate('from', 'name email')
  .lean()
  .exec(function(err, messages) {
    if (err) {
      var payload = {
        msg: "Couldn't search the database for message threads!"
      };
      res.status(500).json(payload);
      payload.err = err;
      Raven.captureException(payload);
    } else {
      // console.log(messages)
      var conversationsByUser = messages.reduce(function(acc, el, i) {
        var otherUser;
        if (el.to._id.toString() === res.locals.session.accountId) {
          otherUser = el.from;
        } else {
          otherUser = el.to;
        }
        
        el.otherUser = otherUser;
        
        if (!acc[otherUser._id]) {
          acc[otherUser._id] = {
            otherUser: otherUser,
            messageCount: 0
          }
          
          // Do not fill messages for light requests
          if (!req.query.light) acc[otherUser._id].messages = [];
        }
        
        // Do not fill messages for light requests
        if (!req.query.light && !(req.query.limit && acc[otherUser._id].messageCount >= req.query.limit)) acc[otherUser._id].messages.push(el);
        acc[otherUser._id].messageCount += 1;

        return acc;
      }, {});
      
      var conversations = [];
      for (var userId in conversationsByUser) {
        if (conversationsByUser.hasOwnProperty(userId)) {
          conversations.push(conversationsByUser[userId]);
        }
      }

      res.status(200).json(conversations);
    }
  });
});

router.get(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {
    
  if (!req.query.user) {
    res.status(400).send('User parameter required.');
    return;
  }
  
  var messageLimit = req.query.messageLimit ? parseInt(req.query.messageLimit, 10) : 100;

  var query = {
    $or: [
      { to: res.locals.session.accountId, from: req.query.user },
      { to: req.query.user, from: res.locals.session.accountId }
    ]
  }

  Message.find(query)
  .sort({ updated: -1 })
  .limit(messageLimit)
  .populate('to', 'name email')
  .populate('from', 'name email')
  .populate('recipe')
  .populate('originalRecipe')
  .lean()
  .exec(function(err, messages) {
    if (err) {
      var payload = {
        msg: "Couldn't search the database for messages!"
      };
      res.status(500).json(payload);
      payload.err = err;
      Raven.captureException(payload);
    } else {
      messages = messages.map(function(el) {
        var otherUser;
        if (el.to._id.toString() === res.locals.session.accountId) {
          otherUser = el.from;
        } else {
          otherUser = el.to;
        }
        
        el.otherUser = otherUser;
        
        return el;
      }).reverse();

      res.status(200).json(messages);
    }
  });
});

// //Get a single recipe
// router.get(
//   '/:recipeId',
//   cors(),
//   MiddlewareService.validateSession(['user']),
//   MiddlewareService.validateUser,
//   function(req, res, next) {

//   Recipe.findOne({
//     accountId: res.locals.session.accountId,
//     _id: req.params.recipeId
//   })
//   .populate('fromUser', 'name email')
//   .lean()
//   .exec(function(err, recipe) {
//     if (err) {
//       res.status(500).send("Couldn't search the database for recipe!");
//     } else if (!recipe) {
//       res.status(404).send("Recipe with that ID not found!");
//     } else {
//       Label.find({
//         recipes: recipe._id
//       }).lean().exec(function(err, labels) {
//         if (err) {
//           res.status(500).send("Could not query DB for labels.");
//         } else {
//           recipe.labels = labels;
  
//           res.status(200).json(recipe);
//         }
//       });
//     }
//   });
// });

// //Update a recipe
// router.put(
//   '/:id',
//   cors(),
//   MiddlewareService.validateSession(['user']),
//   MiddlewareService.validateUser,
//   upload.single('image'),
//   function(req, res) {
  
//   Recipe.findOne({
//     _id: req.params.id,
//     accountId: res.locals.session.accountId
//   }, function(err, recipe) {
//     if (err) {
//       res.status(500).json({
//         msg: "Couldn't search the database for recipe!"
//       });
//     } else if (!recipe) {
//       res.status(404).json({
//         msg: "Recipe with that ID does not exist!"
//       });
//     } else {
//       if (typeof req.body.title === 'string') recipe.title = req.body.title;
//       if (typeof req.body.description === 'string') recipe.description = req.body.description;
//       if (typeof req.body.yield === 'string') recipe.yield = req.body.yield;
//       if (typeof req.body.activeTime === 'string') recipe.activeTime = req.body.activeTime;
//       if (typeof req.body.totalTime === 'string') recipe.totalTime = req.body.totalTime;
//       if (typeof req.body.source === 'string') recipe.source = req.body.source;
//       if (typeof req.body.url === 'string') recipe.url = req.body.url;
//       if (typeof req.body.notes === 'string') recipe.notes = req.body.notes;
//       if (typeof req.body.ingredients === 'string') recipe.ingredients = req.body.ingredients;
//       if (typeof req.body.instructions === 'string') recipe.instructions = req.body.instructions;
//       if (typeof req.body.folder === 'string') recipe.folder = req.body.folder;
      
//       // Check if user uploaded a new image. If so, delete the old image to save space and $$
//       if (req.file) {
//         // Remove old (replaced) image from our S3 bucket
//         if (recipe.image && recipe.image.key) {
//           deleteS3Object(recipe.image.key, function() {
//             console.log("Cleaned old image from s3", recipe.image.key);
//           }, function(err) {
//             console.log("Error cleaning old image from s3 ", err, err.stack);
//           });
//         }

//         recipe.image = req.file;
//       }

//       recipe.updated = Date.now();

//       recipe.save(function(err, recipe) {
//         if (err) {
//           res.status(500).send("Could not save updated recipe!");
//         } else {
//           res.status(200).json(recipe);
//         }
//       });
//     }
//   });
// });

module.exports = router;
