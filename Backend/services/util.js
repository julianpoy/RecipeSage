var aws = require('aws-sdk');
var multer = require('multer');
var multerImager = require('multer-imager');
var multerS3 = require('multer-s3');
var request = require('request');
var Raven = require('raven');
let fs = require('fs-extra');
let gm = require('gm');
let path = require('path');

// DB
var Op = require("sequelize").Op;
var User = require('../models').User;
var Recipe = require('../models').Recipe;
var FCMToken = require('../models').FCMToken;

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

exports.sendmail = (toAddresses, ccAddresses, subject, html, plain) => {
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
  return new aws.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();
}

exports.fetchImage = url => {
  return new Promise(resolve => {
    request.get({
      url: url,
      encoding: null
    }, (err, res, body) => {
      if (err) throw err;

      resolve({ res, body })
    });
  })
}

exports.sendBufferToS3 = buffer => {
  let key = new Date().getTime().toString();
  let bucket = config.aws.bucket
  let acl = 'public-read'

  return s3.putObject({
    Bucket: bucket,
    Key: key,
    ACL: acl,
    Body: buffer // buffer
  }).promise().then(s3Response => {
    return {
      s3Response,
      key,
      acl,
      bucket
    }
  })
}

exports.formatS3ImageResponse = (key, mimetype, size, etag) => {
  return {
    fieldname: "image",
    originalname: 'recipe-sage-img.jpg',
    mimetype,
    size,
    bucket: config.aws.bucket,
    key,
    acl: "public-read",
    metadata: {
      fieldName: "image"
    },
    location: 'https://' + config.aws.bucket + '.s3.' + config.aws.region + '.amazonaws.com/' + key,
    etag
  }
}

exports.sendURLToS3 = url => {
  return exports.fetchImage(url).then(({ res, body }) => {

    var contentType = res.headers['content-type'];
    var contentLength = res.headers['content-length'];

    return exports.sendBufferToS3(body).then(result => {
      return exports.formatS3ImageResponse(result.key, contentType, contentLength, result.s3Response.ETag)
    });
  })
}

exports.sendFileToS3 = path => {
  return fs.readFile(path).then(buf => {
    return new Promise(resolve => {
      var gmObj = gm(buf, 'image.jpg');
      gmObj.size((err, size) => {
        if (err) throw err;

        if (size.width > 400) {
          let width = 200
          let height
          gmObj.resize(width, height, '')
            .autoOrient()
            .toBuffer('PNG', (err, buffer) => {
              if (err) throw err;
              resolve(buffer);
            });
        } else {
          gmObj.toBuffer('PNG', (err, buffer) => {
            if (err) throw err;
            resolve(buffer);
          });
        }
      });
    })
  }).then(stream => {
    return exports.sendBufferToS3(stream)
  }).then(result => {
    var stats = fs.statSync(path);
    return exports.formatS3ImageResponse(result.key, 'image/png', stats["size"], result.s3Response.ETag)
  })
}

exports.upload = multer({
  storage: multerImager({
    dirname: '/',
    bucket: config.aws.bucket,
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
    region: config.aws.region,
    filename: (req, file, cb) => {  // [Optional]: define filename (default: random)
      cb(null, Date.now())                // i.e. with a timestamp
    },                                    //
    gm: {                                 // [Optional]: define graphicsmagick options
      width: 200,                         // doc: http://aheckmann.github.io/gm/docs.html#resize
      // height: 200,
      options: '',
      format: 'jpg',                      // Default: jpg - Unused by our processor
      process: (gm, options, inputStream, outputStream) => {
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
  }),
  limits: {
    fileSize: 4 * 1024 * 1024 // 4MB
  }
});

exports.deleteS3Object = (key, success, fail) => {
  return new Promise((resolve, reject) => {
    s3.deleteObject({
      Bucket: config.aws.bucket,
      Key: key
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

exports.dispatchImportNotification = (user, status, reason) => {
  var event;
  if (status === 0) {
    event = 'complete';
  } else if (status === 1) {
    event = 'failed';
  } else if (status === 2) {
    event = 'working';
  } else {
    return;
  }

  let type = "import:pepperplate:" + event

  var message = {
    type,
    reason: reason || 'status'
  }

  let sendQueues = []
  if (user.fcmTokens) {
    sendQueues.push(FirebaseService.sendMessages(user.fcmTokens.map(fcmToken => fcmToken.token), message));
  }

  sendQueues.push(GripService.broadcast(user.id, type, message));

  return Promise.all(sendQueues);
}

exports.dispatchMessageNotification = (user, fullMessage) => {
  var message = {
    id: fullMessage.id,
    body: fullMessage.body.substring(0, 1000), // Keep payload size reasonable if there's a long message. Max total payload size is 2048
    otherUser: fullMessage.otherUser,
    fromUser: fullMessage.fromUser,
    toUser: fullMessage.toUser
  };

  if (fullMessage.recipe) {
    message.recipe = {
      id: fullMessage.recipe.id,
      title: fullMessage.recipe.title,
      image: {}
    };

    if (fullMessage.recipe.image) {
      message.recipe.image.location = fullMessage.recipe.image.location;
    }
  }

  let sendQueues = [];
  if (user.fcmTokens) {
    var notification = {
      type: "messages:new",
      message: JSON.stringify(message)
    };

    sendQueues.push(FirebaseService.sendMessages(user.fcmTokens.map(fcmToken => fcmToken.token), notification));
  }

  sendQueues.push(GripService.broadcast(user.id, 'messages:new', message));

  return Promise.all(sendQueues);
}

exports._findTitle = (userId, recipeId, basename, transaction, ctr) => {
  var adjustedTitle;
  if (ctr == 1) {
    adjustedTitle = basename;
  } else {
    adjustedTitle = basename + ' (' + ctr + ')';
  }
  return Recipe.findOne({
    where: {
      id: { [Op.ne]: recipeId },
      userId: userId,
      title: adjustedTitle
    },
    transaction
  })
  .then(dupe => {
    if (dupe) {
      return exports._findTitle(userId, recipeId, basename, transaction, ctr + 1);
    }

    return adjustedTitle
  });
}

exports.findTitle = (userId, recipeId, basename, transaction) => {
  return exports._findTitle(userId, recipeId, basename, transaction, 1);
}

exports.shareRecipe = (recipeId, senderId, recipientId, transaction) => {
  return Recipe.findById(recipeId, { transaction }).then(recipe => {
    if (!recipe) {
      var e = new Error("Could not find recipe to share");
      e.status = 404;
      throw e;
    } else {
      return new Promise((resolve, reject) => {
        if (recipe.image && recipe.image.location) {
          exports.sendURLToS3(recipe.image.location).then(resolve).catch(reject)
        } else {
          resolve(null);
        }
      }).then(img => {
        return exports.findTitle(recipientId, null, recipe.title, transaction).then(adjustedTitle => {
          return Recipe.create({
            userId: recipientId,
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
            fromUserId: senderId
          }, {
            transaction
          });
        });
      });
    }
  });
}

exports.findFilesByRegex = (searchPath, regex) => {
  if (!fs.existsSync(searchPath)) {
    return [];
  }

  return fs.readdirSync(searchPath).reduce((acc, subPath) => {
    let newPath = path.join(searchPath, subPath);

    if (newPath.match(regex)) {
      return [newPath, ...acc]
    }

    if (fs.lstatSync(newPath).isDirectory()) return [...acc, ...exports.findFilesByRegex(newPath, regex)]

    return acc
  }, [])
};

exports.sanitizeEmail = email => (email || '').trim().toLowerCase();

// Very liberal email regex. Don't want to reject valid user emails.
let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
exports.validateEmail = email => emailRegex.test(email);

exports.validatePassword = password => typeof password === 'string' && password.length >= 6;
