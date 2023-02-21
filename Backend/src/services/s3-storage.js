const aws = require('aws-sdk');
const multerImager = require('multer-imager');
const sharp = require('sharp');
const crypto = require('crypto');

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

exports.generateStorageLocation = key => process.env.AWS_S3_PUBLIC_PATH ? process.env.AWS_S3_PUBLIC_PATH + key : 'https://' + process.env.AWS_BUCKET + '.s3.' + process.env.AWS_REGION + '.amazonaws.com/' + key;


const S3_DEFAULT_ACL = 'public-read';
const S3_DEFAULT_CACHECONTROL = 'public,max-age=31536000,immutable'; // 365 Days

/**
  This limit is set/enforced by S3 on bulk delete operations
  https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObjects-property
*/
const DELETE_STORAGE_OBJECTS_LIMIT = 1000;

exports.sendBufferToStorage = buffer => {
  const RAND_LEN = 14; // Number of digits to add as random to end of key
  const RAND_MIN = 10 ** (RAND_LEN - 1);
  const RAND_MAX = (RAND_MIN * 10) - 1;
  const rand = crypto.randomInt(RAND_MIN, RAND_MAX); // Generate RAND_LEN number of digits for end of key

  const key = `${new Date().getTime().toString()}-${rand}`;
  const bucket = process.env.AWS_BUCKET;

  return s3.putObject({
    Bucket: bucket,
    Key: key,
    ACL: S3_DEFAULT_ACL,
    CacheControl: S3_DEFAULT_CACHECONTROL,
    Body: buffer // buffer
  }).promise().then(s3Response => {
    return {
      s3Response,
      ETag:s3Response.ETag,
      key,
      acl: S3_DEFAULT_ACL,
      bucket
    };
  });
};

exports.formatImageResponse = (key, mimetype, size, etag) => {
  return {
    fieldname: 'image',
    originalname: 'recipe-sage-img.jpg',
    mimetype,
    size,
    bucket: process.env.AWS_BUCKET,
    key,
    acl: S3_DEFAULT_ACL,
    metadata: {
      fieldName: 'image'
    },
    location: exports.generateStorageLocation(key),
    etag
  };
};


exports.deleteStorageObject = key => {
  return s3.deleteObject({
    Bucket: process.env.AWS_BUCKET,
    Key: key
  }).promise();
};

const paginate = (objects, limit) => {
  const mut = [...objects];

  const out = [];
  while (mut.length > 0) {
    out.push(mut.splice(0, limit));
  }

  return out;
};

exports.deleteStorageObjects = keys => {
  const paginatedKeys = paginate(keys, DELETE_STORAGE_OBJECTS_LIMIT);

  return Promise.all(paginatedKeys.map((keyPage) => {
    return s3.deleteObjects({
      Bucket: process.env.AWS_BUCKET,
      Delete: {
        Objects: keyPage.map(key => ({ Key: key }))
      }
    }).promise();
  }));
};

exports.multerStorage = (width, height, quality, highResConversion, resolve, reject)=> multerImager({
  dirname: '/',
  bucket: process.env.AWS_BUCKET,
  ...s3Config,
  filename: (req, file, cb) => {  // [Optional]: define filename (default: random)
    cb(null, Date.now());                // i.e. with a timestamp
  },                                    //
  gm: {                                 // [Optional]: define graphicsmagick options
    width,                         // doc: http://aheckmann.github.io/gm/docs.html#resize
    // height: 200,
    options: '',
    format: 'jpg',                      // Default: jpg - Unused by our processor
    process: (gm, options, inputStream, outputStream) => {
      const pipeline = sharp();
      pipeline.rotate() // Rotates based on EXIF data
        .resize(width, height, {
          fit: highResConversion ? 'inside' : 'cover',
        })
        .jpeg({
          quality,
          // chromaSubsampling: '4:4:4' // Enable this option to prevent color loss at low quality - increases image size
        })
        .on('error', function (e) {
          console.error('Sharp Error: ' + e);
          reject(e);
        })
        .pipe(outputStream)
        .on('error', function (e) {
          console.error('Sharp Error: ' + e);
          reject(e);
        });

      inputStream.pipe(pipeline);
    }
  },
  s3: {                                // [Optional]: define s3 options
    ACL: S3_DEFAULT_ACL,
    CacheControl: S3_DEFAULT_CACHECONTROL,
    Metadata: {
      'acl': S3_DEFAULT_ACL,
      'cache-control': S3_DEFAULT_CACHECONTROL
    }
  }
});

