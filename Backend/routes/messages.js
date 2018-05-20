var express = require('express');
var router = express.Router();
var cors = require('cors');
var aws = require('aws-sdk');
var multer = require('multer');
var multerImager = require('multer-imager');
var multerS3 = require('multer-s3');
var request = require('request');

// DB
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Recipe = mongoose.model('Recipe');
var Label = mongoose.model('Label');
var Message = mongoose.model('Message');

// Service
var SessionService = require('../services/sessions');
var MiddlewareService = require('../services/middleware');
var FirebaseService = require('../services/firebase');
var config = require('../config/config.json');

var s3 = new aws.S3();
aws.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  subregion: config.aws.region,
});

// Dupe from index.js
function sendURLToS3(url, callback) {
  request({
    url: url,
    encoding: null
  }, function(err, res, body) {
    if (err)
      return callback(err, res);

    var key = new Date().getTime().toString();
    
    var contentType = res.headers['content-type'];
    var contentLength = res.headers['content-length'];
    console.log(contentType, contentLength)

    s3.putObject({
      Bucket: config.aws.bucket,
      Key: key,
      ACL: 'public-read',
      Body: body // buffer
    }, function(err, response) {
      var img;

      if (!err) {
        img = {
          fieldname: "image",
          originalname: 'recipe-sage-img.jpg',
          mimetype: contentType,
          size: contentLength,
          bucket: config.aws.bucket,
          key: key,
          acl: "public-read",
          metadata: {
            fieldName: "image"
          },
          location: 'https://' + config.aws.bucket + '.s3.' + config.aws.region + '.amazonaws.com/' + key,
          etag: response.ETag
        }
      }
      
      callback(err, img)
    });
  });
}

function dispatchMessageNotification(user, message) {
  if (user.fcmTokens) {
    var message = {
      type: "messages:new",
      message: JSON.stringify(message)
    }
    
    for (var i = 0; i < user.fcmTokens.length; i++) {
      let token = user.fcmTokens[i];
      FirebaseService.sendMessage(token, message, function() {}, function() {
        User.update({ _id: user._id }, { $pull: { fcmTokens: token } }).exec(function() {});
      });
    }
  }
}

function shareRecipe(recipeId, senderId, recipientId, resolve, reject) {
  Recipe.findById(recipeId).lean().exec(function(err, recipe) {
    if (err) {
      reject(500, 'Could not search DB for recipe.');
    } else if (!recipe) {
      reject(404, 'Could not find recipe under that ID.');
    } else {
      var uploadByURLPromise = new Promise(function(resolve, reject) {
        if (recipe.image && recipe.image.location) {
          sendURLToS3(recipe.image.location, function(err, img) {
            if (err) {
              reject(err);
            } else {
              resolve(img);
            }
          });
        } else {
          resolve(null);
        }  
      });
      
      uploadByURLPromise.then(function(img) {
        new Recipe({
          accountId: recipientId,
      		title: recipe.title,
          description: recipe.description,
          yield: recipe.yield,
          activeTime: recipe.activeTime,
          totalTime: recipe.totalTime,
          source: recipe.source,
          url: recipe.url,
          notes: recipe.notes,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          image: img,
          folder: 'inbox',
          fromUser: senderId
        }).save(function(err, sharedRecipe) {
          if (err) {
            reject(500, "Error saving the recipe!");
          } else {
            resolve(sharedRecipe);
          }
        });
      }, function() {
        reject(500, "Error uploading image via URL!");
      });
    }
  });
}

router.post(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {
  
  console.log(req.body.to)
  User.findById(req.body.to).exec(function(err, recipient) {
    if (err) {
      res.status(500).send('Could not search DB for user.');
    } else if (!recipient) {
      res.status(404).send('Could not find user under that ID.');
    } else {
      function shareRecipeStep() {
        shareRecipe(req.body.recipeId, res.locals.session.accountId, req.body.to, function(sharedRecipe) {
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
            res.status(500).send("Error saving the recipe!");
          } else {
            message.populate('to from', 'name email', function(err, message) {
              if (err) {
                res.status(500).send("Error gathering message to/from!");
              } else {
                message.populate('recipe originalRecipe', function(err, message) {
                  if (err) {
                    res.status(500).send("Error gathering message recipe!");
                  } else {
                    message = message.toObject();
                    
                    // For sender (just sent)
                    message.otherUser = message.to;
                    res.status(201).json(message);
                    
                    // Alert for recipient (now receiving via notification)
                    message.otherUser = message.from;

                    dispatchMessageNotification(recipient, message);
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
      res.status(500).send("Couldn't search the database for recipes!");
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
      res.status(500).send("Couldn't search the database for recipes!");
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
