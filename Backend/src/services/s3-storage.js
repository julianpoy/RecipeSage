var aws = require('aws-sdk');
var multerImager = require('multer-imager');
var multerS3 = require('multer-s3');
let sharp = require('sharp');

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


exports.sendBufferToStorage = buffer => {
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
            ETag:s3Response.ETag,
            key,
            acl: S3_DEFAULT_ACL,
            bucket
        }
    })
}

exports.formatImageResponse = (key, mimetype, size, etag) => {
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
        location: exports.generateStorageLocation(key),
        etag
    }
}


exports.deleteStorageObject = key => {
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

exports.deleteStorageObjects = keys => {
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

exports.multerStorage = (width,height,quality,highResConversion)=> multerImager({
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
})

