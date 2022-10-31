
var multer = require('multer');
let fs = require('fs-extra');
const UtilService = require('./util');
const s3Storage = require('./s3-storage');
const firebaseStorage = require('./firebase-storage');

const storageMethods = {
  'FIREBASE': firebaseStorage,
  'S3': s3Storage,
};
const storage = storageMethods[process.env.STORAGE_TYPE || 'S3'];

const HIGH_RES_IMG_CONVERSION_WIDTH = 1024;
const HIGH_RES_IMG_CONVERSION_HEIGHT = 1024;
const HIGH_RES_IMG_CONVERSION_QUALITY = 55;

const LOW_RES_IMG_CONVERSION_WIDTH = 200;
const LOW_RES_IMG_CONVERSION_HEIGHT = 200;
const LOW_RES_IMG_CONVERSION_QUALITY = 55;

exports.generateStorageLocation = storage.generateStorageLocation;
exports.sendBufferToStorage = storage.sendBufferToStorage;
exports.formatImageResponse = storage.formatImageResponse;
exports.deleteStorageObject = storage.deleteStorageObject;
exports.deleteStorageObjects = storage.deleteStorageObjects;

exports.sendURLToStorage = (url, highResConversion) => {
  return UtilService.fetchImage(url).then((buffer) => {
    return UtilService.convertImage(buffer, highResConversion).then(convertedBuffer => {
      return exports.sendBufferToStorage(convertedBuffer).then(result => {
        return exports.formatImageResponse(result.key, 'image/jpeg', Buffer.byteLength(convertedBuffer), result.ETag);
      });
    });
  });
};

exports.sendFileToStorage = (file, isBuffer, highResConversion) => {
  let p = isBuffer ? Promise.resolve(file) : fs.readFile(file);

  return p.then(buf => {
    return UtilService.convertImage(buf, highResConversion);
  }).then(stream => {
    return exports.sendBufferToStorage(stream);
  }).then(result => {
    var stats = isBuffer ? { size: file.length } : fs.statSync(file);
    return exports.formatImageResponse(result.key, 'image/jpeg', stats['size'], result.ETag);
  });
};

exports.upload = async (fieldName, req, res, highResConversion) => {
  const height = highResConversion ? HIGH_RES_IMG_CONVERSION_HEIGHT : LOW_RES_IMG_CONVERSION_HEIGHT;
  const width = highResConversion ? HIGH_RES_IMG_CONVERSION_WIDTH : LOW_RES_IMG_CONVERSION_WIDTH;
  const quality = highResConversion ? HIGH_RES_IMG_CONVERSION_QUALITY : LOW_RES_IMG_CONVERSION_QUALITY;

  await new Promise((resolve, reject) => {
    multer({
      storage: storage.multerStorage(width, height, quality, highResConversion, resolve, reject),
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
  });
};

