const sharp = require('sharp');

const { admin } = require('./firebase-admin');

const BUCKET = process.env.FIRESTORE_BUCKET || "sage-recipe-images"
const S3_DEFAULT_ACL = 'public-read';

let bucket;
try {
    bucket = admin.storage().bucket(BUCKET);
} catch(e) {
    console.error(e);
}

exports.generateStorageLocation = key => `https://www.googleapis.com/download/storage/v1/b/${BUCKET}/o/${key}?alt=media`

exports.sendBufferToStorage = buffer => {
    let key = new Date().getTime().toString();
    return bucket.file(key).save(buffer).then(() => {
        return bucket.file(key).makePublic().then((filePubRes) => {
            return {
                ETag: filePubRes.etag,
                key,
                acl: S3_DEFAULT_ACL,
                bucket
            }
        });
    });
}

exports.formatImageResponse = (key, mimetype, size, etag) => {
    return {
        fieldname: "image",
        originalname: 'recipe-sage-img.jpg',
        mimetype,
        size,
        bucket: BUCKET,
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
        bucket.file(key).delete().then((data) => {
            resolve(data)
        },
            (err) => {
                reject(err)
            })
    });
}

exports.deleteStorageObjects = keys => {
    return new Promise((resolve, reject) => {
        keys.forEach(async key => {
            try {
                res = await bucket.file(key).delete({ ignoreNotFound: true });
            } catch (ex) {
                reject(ex)
            }
        })
        resolve({ success: true })
    });
}


exports.multerStorage = (width, height, quality, highResConversion) =>
    new CustomMulterFirebaseStorage({

        bucket: BUCKET,
        firebaseStorage: bucket,
        path: '',
        public: true,
        fileName: Date.now(),
        process: (width, height, inStream, outStream) => {
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
                .pipe(outStream)
                .on('error', function (e) {
                    console.error('Sharp Error: ' + e);
                    reject(e);
                });

            inStream.pipe(pipeline);
        }, width: width, height: 200
    })

function CustomMulterFirebaseStorage(opts = { destination, bucket, firebaseStorage, path, public, fileName, process, width, height }) {
    this.path = opts.path;
    this.firebaseStorage = opts.firebaseStorage;
    this.bucket = opts.bucket;
    this.isPublic = opts.public;
    this.fileName = opts.fileName;
    this.resizeOptWidth = opts.width;
    this.resizeOptHeight = opts.height;
    this.resizeOptProcess = opts.process;

}
CustomMulterFirebaseStorage.prototype._handleFile = function _handleFile(req, file, cb) {

    var self = this;
    const fileKey = `${self.path}${self.fileName}.jpeg`
    const outStream = self.firebaseStorage.file(fileKey).createWriteStream({metadata: {
        contentType: 'image/jpeg'
    }})
    this.resizeOptProcess(this.width, this.height, file.stream, outStream)
    outStream.on('error', cb);
    outStream.on('finish', async function () {
        if (self.isPublic) {
            self.firebaseStorage.file(fileKey).makePublic()
        }
        cb(null, {
            size: outStream.bytesWritten,
            key: fileKey,
            location: exports.generateStorageLocation(fileKey)
        });
    });
}
