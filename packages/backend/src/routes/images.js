const express = require('express');
const multer = require('multer');
const router = express.Router();

// DB
const Image = require('../models').Image;

// Service
const MiddlewareService = require('../services/middleware');
const { writeImageBuffer } = require('../services/storage/image');
const SubscriptionsService = require('../services/subscriptions');
const {ObjectTypes} = require('../services/storage/shared');

// Util
const { wrapRequestWithErrorHandler } = require('../utils/wrapRequestWithErrorHandler');
const { BadRequest, NotFound } = require('../utils/errors');

router.post('/',
  MiddlewareService.validateSession(['user']),
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 8 * 1024 * 1024 // 8MB
    }
  }).single('image'),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (!req.file) {
      throw BadRequest('Must specify multipart field "image"');
    }

    const encodeInHighRes = await SubscriptionsService.userHasCapability(
      res.locals.session.userId,
      SubscriptionsService.CAPABILITIES.HIGH_RES_IMAGES
    );

    let file;
    try {
      file = await writeImageBuffer(ObjectTypes.RECIPE_IMAGE, req.file.buffer, encodeInHighRes);
    } catch (e) {
      e.status = 415;
      throw e;
    }

    const image = await Image.create({
      userId: res.locals.session.userId,
      location: file.location,
      key: file.key,
      json: file
    });

    res.status(200).send(image);
  }));

router.get(
  '/link/:imageId',
  wrapRequestWithErrorHandler(async (req, res) => {
    const image = await Image.findByPk(req.params.imageId);

    if (!image) {
      throw NotFound('Image with that id not found');
    }

    return res.redirect(image.location);
  }));

if (process.env.STORAGE_TYPE === 'filesystem') {
  router.use('/filesystem', express.static(process.env.FILESYSTEM_STORAGE_PATH));
}

module.exports = router;
