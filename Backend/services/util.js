var aws = require('aws-sdk');
var multer = require('multer');
var multerImager = require('multer-imager');
var multerS3 = require('multer-s3');
var request = require('request');

// DB
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Recipe = mongoose.model('Recipe');

// Service
var FirebaseService = require('../services/firebase');
var config = require('../config/config.json');

var s3 = new aws.S3();
aws.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  subregion: config.aws.region,
});

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
exports.sendURLToS3 = sendURLToS3;

exports.upload = multer({
  storage: multerImager({
    dirname: '/',
    bucket: config.aws.bucket,
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
    region: config.aws.region,
    filename: function (req, file, cb) {  // [Optional]: define filename (default: random)
      cb(null, Date.now())                // i.e. with a timestamp
    },                                    //
    gm: {                                 // [Optional]: define graphicsmagick options
      width: 200,                         // doc: http://aheckmann.github.io/gm/docs.html#resize
      // height: 200,
      options: '',
      format: 'jpg',                      // Default: jpg - Unused by our processor 
      process: function(gm, options, inputStream, outputStream) {
        var gmObj = gm(inputStream);
        gmObj.size({ bufferStream: true }, (err, size) => {
          if (err || size.width > 400) {
            gmObj.resize(options.gm.width , options.gm.height , options.gm.options)
            .autoOrient()
            .stream()
            .pipe(outputStream);
          } else {
            gmObj.stream()
            .pipe(outputStream);
          }
        });
      }
    },
    s3 : {                                // [Optional]: define s3 options
      ACL: 'public-read',
      Metadata: {
        'acl': 'public-read'
      }
    }
  })
});

exports.deleteS3Object = function(key, success, fail){
  s3.deleteObject({
    Bucket: config.aws.bucket,
    Key: key
  }, function(err, data) {
    if (err) fail(err);
    else success(data);
  });
}

// Deprecated
exports.dispatchShareNotification = function(user, recipe) {
  if (user.fcmTokens) {
    var message = {
      type: "recipe:inbox:new",
      recipe: JSON.stringify(recipe)
    }
    
    for (var i = 0; i < user.fcmTokens.length; i++) {
      let token = user.fcmTokens[i];
      FirebaseService.sendMessage(token, message, function() {}, function() {
        User.update({ _id: user._id }, { $pull: { fcmTokens: token } }).exec(function() {});
      });
    }
  }
}

exports.dispatchImportNotification = function(user, status, reason) {
  var type;
  if (status === 0) {
    type = 'complete';
  } else if (status === 1) {
    type = 'failed';
  } else if (status === 2) {
    type = 'working';
  } else {
    return;
  }

  if (user.fcmTokens) {
    var message = {
      type: "import:pepperplate:" + type,
      reason: reason || 'status'
    }

    for (var i = 0; i < user.fcmTokens.length; i++) {
      let token = user.fcmTokens[i];
      FirebaseService.sendMessage(token, message, function() {}, function() {
        User.update({ _id: user._id }, { $pull: { fcmTokens: token } }).exec(function() {});
      });
    }
  }
}

exports.dispatchMessageNotification = function(user, fullMessage) {
  if (user.fcmTokens) {
    var message = {
      _id: fullMessage._id,
      body: fullMessage.body.substring(0, 1000), // Keep payload size reasonable if there's a long message. Max total payload size is 2048
      otherUser: fullMessage.otherUser,
      from: fullMessage.from,
      to: fullMessage.to
    };
    
    if (fullMessage.recipe) {
      message.recipe = {
        _id: fullMessage.recipe._id,
        title: fullMessage.recipe.title
      };
    }
    
    var notification = {
      type: "messages:new",
      message: JSON.stringify(message)
    };
    
    for (var i = 0; i < user.fcmTokens.length; i++) {
      let token = user.fcmTokens[i];
      FirebaseService.sendMessage(token, notification, function() {}, function() {
        User.update({ _id: user._id }, { $pull: { fcmTokens: token } }).exec(function() {});
      });
    }
  }
}

function findTitle(userId, recipeId, basename, ctr, success, fail) {
  var adjustedTitle;
  if (ctr == 1) {
    adjustedTitle = basename;
  } else {
    adjustedTitle = basename + ' (' + ctr + ')';
  }
  Recipe.findOne({
    _id: { $ne: recipeId },
    accountId: userId,
    title: adjustedTitle
  }).exec(function(err, dupe) {
    if (err) {
      fail(err);
    } else if (dupe) {
      findTitle(userId, recipeId, basename, ctr + 1, success, fail);
    } else {
      success(adjustedTitle);
    }
  });
}
exports.findTitle = findTitle;

exports.shareRecipe = function(recipeId, senderId, recipientId, resolve, reject) {
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
        findTitle(recipientId, null, recipe.title, 1, function(adjustedTitle) {
          new Recipe({
            accountId: recipientId,
        		title: adjustedTitle,
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
          reject(500, "Could not avoid duplicate title!");
        });
      }, function() {
        reject(500, "Error uploading image via URL!");
      });
    }
  });
}
