var aws = require('aws-sdk');
var multer = require('multer');
var multerImager = require('multer-imager');
var multerS3 = require('multer-s3');
var Raven = require('raven');
let fs = require('fs-extra');
let sharp = require('sharp');
let path = require('path');
let zlib = require('zlib');
const fetch = require('node-fetch');

// Service
var FirebaseService = require('./firebase');
var GripService = require('./grip');

const s3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  subregion: process.env.AWS_REGION,
  region: process.env.AWS_REGION,
};

if (process.env.AWS_ENDPOINT) s3Config.endpoint = process.env.AWS_ENDPOINT; // Needed for minio
if (process.env.AWS_S3_FORCE_PATH_STYLE !== null) s3Config.s3ForcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE; // Needed for minio
if (process.env.AWS_S3_SIGNATURE_VERSION) s3Config.signatureVersion = process.env.AWS_S3_SIGNATURE_VERSION; // Needed for minio

const s3 = new aws.S3(s3Config);

exports.generateS3Location = key => process.env.AWS_S3_PUBLIC_PATH ? process.env.AWS_S3_PUBLIC_PATH + key : 'https://' + process.env.AWS_BUCKET + '.s3.' + process.env.AWS_REGION + '.amazonaws.com/' + key;

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
      'julian@recipesage.com',
      /* more items */
    ],
  };

  // Create the promise and SES service object
  return new aws.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();
}

exports.fetchImage = async url => {
  const response = await fetch(url, {
    method: 'GET',
  });

  return response.buffer();
}

const S3_DEFAULT_ACL = 'public-read';
const S3_DEFAULT_CACHECONTROL = 'public,max-age=31536000,immutable'; // 365 Days

const HIGH_RES_IMG_CONVERSION_WIDTH = 1024;
const HIGH_RES_IMG_CONVERSION_HEIGHT = 1024;
const HIGH_RES_IMG_CONVERSION_QUALITY = 55;

const LOW_RES_IMG_CONVERSION_WIDTH = 200;
const LOW_RES_IMG_CONVERSION_HEIGHT = 200;
const LOW_RES_IMG_CONVERSION_QUALITY = 55;

exports.sendBufferToS3 = buffer => {
  let key = new Date().getTime().toString();
  let bucket = process.env.AWS_BUCKET;

  return s3.putObject({
    Bucket: bucket,
    Key: key,
    ACL: S3_DEFAULT_ACL,
    CacheControl: S3_DEFAULT_CACHECONTROL,
    Body: buffer // buffer
  }).promise().then(s3Response => {
    return {
      s3Response,
      key,
      acl: S3_DEFAULT_ACL,
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
    bucket: process.env.AWS_BUCKET,
    key,
    acl: S3_DEFAULT_ACL,
    metadata: {
      fieldName: "image"
    },
    location: exports.generateS3Location(key),
    etag
  }
}

exports.convertImage = (imageBuf, highResConversion) => {
  const height = highResConversion ? HIGH_RES_IMG_CONVERSION_HEIGHT : LOW_RES_IMG_CONVERSION_HEIGHT;
  const width = highResConversion ? HIGH_RES_IMG_CONVERSION_WIDTH : LOW_RES_IMG_CONVERSION_WIDTH;
  const quality = highResConversion ? HIGH_RES_IMG_CONVERSION_QUALITY : LOW_RES_IMG_CONVERSION_QUALITY;

  return new Promise((resolve, reject) => {
    try {
      sharp(imageBuf)
        .rotate() // Rotates based on EXIF data
        .resize(width, height) // Uses object-fit: cover by default
        .jpeg({
          quality,
          // chromaSubsampling: '4:4:4'
        })
        .on('error', function(e) {
          console.error('Sharp Error: ' + e);
          reject(e);
        })
        .toBuffer((err, buffer, info) => {
          if (err) reject(err);
          resolve(buffer);
        })
        .on('error', function(e) {
          console.error('Sharp Error: ' + e);
          reject(e);
        });
    } catch (e) {
      reject(e);
    }
  })
}

exports.sendURLToS3 = (url, highResConversion)  => {
  return exports.fetchImage(url).then((buffer) => {
    return exports.convertImage(buffer, highResConversion).then(convertedBuffer => {
      return exports.sendBufferToS3(convertedBuffer).then(result => {
        return exports.formatS3ImageResponse(result.key, "image/jpeg", Buffer.byteLength(convertedBuffer), result.s3Response.ETag);
      });
    });
  })
}

exports.sendFileToS3 = (file, isBuffer, highResConversion) => {
  let p = isBuffer ? Promise.resolve(file) : fs.readFile(file);

  return p.then(buf => {
    return exports.convertImage(buf, highResConversion);
  }).then(stream => {
    return exports.sendBufferToS3(stream);
  }).then(result => {
    var stats = isBuffer ? { size: file.length } : fs.statSync(file);
    return exports.formatS3ImageResponse(result.key, 'image/jpeg', stats["size"], result.s3Response.ETag)
  })
}

exports.upload = async (fieldName, req, res, highResConversion) => {
  const height = highResConversion ? HIGH_RES_IMG_CONVERSION_HEIGHT : LOW_RES_IMG_CONVERSION_HEIGHT;
  const width = highResConversion ? HIGH_RES_IMG_CONVERSION_WIDTH : LOW_RES_IMG_CONVERSION_WIDTH;
  const quality = highResConversion ? HIGH_RES_IMG_CONVERSION_QUALITY : LOW_RES_IMG_CONVERSION_QUALITY;

  await new Promise((resolve, reject) => {
    multer({
      storage: multerImager({
        dirname: '/',
        bucket: process.env.AWS_BUCKET,
        ...s3Config,
        filename: (req, file, cb) => {  // [Optional]: define filename (default: random)
          cb(null, Date.now())                // i.e. with a timestamp
        },                                    //
        gm: {                                 // [Optional]: define graphicsmagick options
          width,                         // doc: http://aheckmann.github.io/gm/docs.html#resize
          // height: 200,
          options: '',
          format: 'jpg',                      // Default: jpg - Unused by our processor
          process: (gm, options, inputStream, outputStream) => {
            let pipeline = sharp()
            pipeline.rotate() // Rotates based on EXIF data
              .resize(width, height, {
                fit: highResConversion ? 'inside' : 'cover',
              })
              .jpeg({
                quality,
                // chromaSubsampling: '4:4:4' // Enable this option to prevent color loss at low quality - increases image size
              })
              .on('error', function(e) {
                console.error('Sharp Error: ' + e);
                reject(e);
              })
              .pipe(outputStream)
              .on('error', function(e) {
                console.error('Sharp Error: ' + e);
                reject(e);
              });

            inputStream.pipe(pipeline);
          }
        },
        s3 : {                                // [Optional]: define s3 options
          ACL: S3_DEFAULT_ACL,
          CacheControl: S3_DEFAULT_CACHECONTROL,
          Metadata: {
            'acl': S3_DEFAULT_ACL,
            'cache-control': S3_DEFAULT_CACHECONTROL
          }
        }
      }),
      limits: {
        fileSize: 8 * 1024 * 1024 // 8MB
      }
    }).single(fieldName)(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  })
};

exports.deleteS3Object = key => {
  return new Promise((resolve, reject) => {
    s3.deleteObject({
      Bucket: process.env.AWS_BUCKET,
      Key: key
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

exports.deleteS3Objects = keys => {
  return new Promise((resolve, reject) => {
    s3.deleteObjects({
      Bucket: process.env.AWS_BUCKET,
      Delete: {
        Objects: keys.map(key => ({ Key: key }))
      }
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

exports.sortUserProfileImages = user => {
  if (user.toJSON) user = user.toJSON();

  if (user.profileImages && user.profileImages.length > 0) {
    user.profileImages.sort((a, b) => a.User_Profile_Image.order - b.User_Profile_Image.order);
  }

  return user;
}

exports.sortRecipeImages = recipe => {
  if (recipe.toJSON) recipe = recipe.toJSON();

  if (recipe.images && recipe.images.length > 0) {
    recipe.images.sort((a, b) => a.Recipe_Image.order - b.Recipe_Image.order);
  }

  return recipe;
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
      images: fullMessage.recipe.images.map(image => ({
        location: image.location
      }))
    };
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

exports.gunzip = buf => {
  return new Promise((resolve, reject) => {
    zlib.gunzip(buf, (err, result) => {
      if (err) reject(err);
      resolve(result);
    })
  })
}

// CBs are an array of promises to be executed by chunkSize
// Waits until previous is done before executing next chunk
exports.executeInChunks = async (cbs, chunkSize) => {
  if (chunkSize < 1) return Promise.resolve();

  let chunks = [];
  for (let i = 0; i < cbs.length; i += chunkSize) {
    chunks.push(cbs.slice(i, i + chunkSize));
  }

  await chunks.reduce((acc, chunk) => {
    return acc.then(() => {
      return Promise.all(chunk.map(cb => cb()))
    })
  }, Promise.resolve())
}

exports.cleanLabelTitle = labelTitle => {
  return (labelTitle || '').trim().toLowerCase().replace(/,/g, '');
}

exports.capitalizeEachWord = input => input.split(" ").map(word => word.charAt(0).toUpperCase() + word.substring(1)).join(" ");

