var aws = require('aws-sdk');
var multer = require('multer');
var multerImager = require('multer-imager');
var multerS3 = require('multer-s3');
var request = require('request');
var Raven = require('raven');

// DB
var Op = require("sequelize").Op;
var User = require('../models').User;
var Recipe = require('../models').Recipe;

// Service
var FirebaseService = require('./firebase');
var GripService = require('./grip');
var config = require('../config/config.json');

var s3 = new aws.S3();
aws.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  subregion: config.aws.region,
  region: config.aws.region,
});

exports.sendmail = function(toAddresses, ccAddresses, subject, html, plain, resolve, reject) {
  ccAddresses = ccAddresses || [];

  // Create sendEmail params
  var params = {
    Destination: { /* required */
      CcAddresses: ccAddresses,
      ToAddresses: toAddresses
    },
    Message: { /* required */
      Body: { /* required */
        Html: {
          Charset: "UTF-8",
          Data: html
        },
        Text: {
          Charset: "UTF-8",
          Data: plain
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject
      }
    },
    Source: '"RecipeSage" <noreply@recipesage.com>', /* required */
    ReplyToAddresses: [
      'noreply@recipesage.com',
      /* more items */
    ],
  };

  // Create the promise and SES service object
  var sendPromise = new aws.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();

  // Handle promise's fulfilled/rejected states
  sendPromise.then(function(data) {
    console.log(data.MessageId);
    resolve(data.messageId);
  }).catch(function(err) {
    console.error(err, err.stack);
    reject(err, err.stack);
  });
}

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
  return new Promise(function(resolve, reject) {
    s3.deleteObject({
      Bucket: config.aws.bucket,
      Key: key
    }, function(err, data) {
      if (err) reject(err);
      else resolve(data);
    });
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
      title: fullMessage.recipe.title,
      image: {}
    };

    if (fullMessage.recipe.image) {
      message.recipe.image.location = fullMessage.recipe.image.location;
    }
  }

  if (user.fcmTokens) {
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

  console.log("about to broadcast")

  GripService.broadcast(user._id, 'messages:new', message);
}

function _findTitle(userId, recipeId, basename, ctr, success, fail) {
  var adjustedTitle;
  if (ctr == 1) {
    adjustedTitle = basename;
  } else {
    adjustedTitle = basename + ' (' + ctr + ')';
  }
  Recipe.findOne({
    where: {
      id: { [Op.ne]: recipeId },
      userId: userId,
      title: adjustedTitle
    }
  })
  .then(function (dupe) {
    if (dupe) {
      findTitle(userId, recipeId, basename, ctr + 1, success, fail);
    } else {
      success(adjustedTitle);
    }
  })
  .catch(function (err) {
    fail(err);
  });
}

function findTitle(userId, recipeId, basename, ctr) {
  return new Promise(function(resolve, reject) {
    _findTitle(userId, recipeId, basename, ctr, resolve, reject);
  });
}
exports.findTitle = findTitle;

exports.shareRecipe = function(recipeId, senderId, recipientId, resolve, reject) {
  Recipe.findById(recipeId).lean().exec(function(err, recipe) {
    if (err) {
      var payload = {
        msg: 'Could not search DB for recipe.',
        err: err
      };
      reject(500, payload);
      Raven.captureException(payload);
    } else if (!recipe) {
      reject(404, 'Could not find recipe under that ID.');
    } else {
      var uploadByURLPromise = new Promise(function(resolve, reject) {
        if (recipe.image && recipe.image.location) {
          sendURLToS3(recipe.image.location, function(err, img) {
            if (err) {
              var payload = {
                msg: 'Could not send URL to s3.',
                err: err,
                img: img
              };
              reject(err);
              Raven.captureException(payload);
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
              var payload = {
                msg: "Error saving the recipe!",
                err: err
              }
              reject(500, payload.msg);
              Raven.captureException(payload);
            } else {
              resolve(sharedRecipe);
            }
          });
        }, function(err) {
          var payload = {
            msg: "Could not avoid duplicate title!",
            err: err
          };
          reject(500, payload.msg);
          Raven.captureException(payload);
        });
      }, function(err) {
        var payload = {
          msg: "Error uploading image via URL!",
          err: err
        }
        reject(500, payload);
        Raven.captureException(payload);
      });
    }
  });
}
