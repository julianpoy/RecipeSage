const express = require('express');
const router = express.Router();

// DB
const Image = require('../models').Image;

// Service
const MiddlewareService = require('../services/middleware');
const StorageService = require('../services/storage');
const SubscriptionsService = require('../services/subscriptions');

// Util
const { wrapRequestWithErrorHandler } = require('../utils/wrapRequestWithErrorHandler');
const { BadRequest, NotFound } = require('../utils/errors');

router.post('/',
  MiddlewareService.validateSession(['user']),
  wrapRequestWithErrorHandler(async (req, res) => {

    const encodeInHighRes = await SubscriptionsService.userHasCapability(
      res.locals.session.userId,
      SubscriptionsService.CAPABILITIES.HIGH_RES_IMAGES
    );

    let file;
    if (req.body.imageURL) {
      try {
        file = await StorageService.sendURLToStorage(req.body.imageURL, encodeInHighRes);
      } catch (e) {
        console.log(e);
        e.status = 415;
        throw e;
      }
    } else {
      try {
        await StorageService.upload('image', req, res, encodeInHighRes);
        file = req.file;
      } catch (e) {
        e.status = 415;
        throw e;
      }
    }

    if (!file) {
      throw BadRequest('Must specify either "image" or "imageURL"');
    }

    const image = await Image.create({
      userId: res.locals.session.userId,
      location: StorageService.generateStorageLocation(file.key),
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

module.exports = router;
