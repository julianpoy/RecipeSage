var express = require('express');
var router = express.Router();

// DB
var Image = require('../models').Image;

// Service
var MiddlewareService = require('../services/middleware');
const StorageService = require('../services/storage');
let SubscriptionsService = require('../services/subscriptions');

router.post('/',
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {

    try {
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
        return res.status(400).send('Must specify either "image" or "imageURL"');
      }
      const image = await Image.create({
        userId: res.locals.session.userId,
        location: StorageService.generateStorageLocation(file.key),
        key: file.key,
        json: file
      });

      res.status(200).send(image);
    } catch (e) {
      next(e);
    }
  });

router.get(
  '/link/:imageId',
  async (req, res) => {
    const image = await Image.findByPk(req.params.imageId);
    if (!image) {
      return res.status(404).send('Not Found');
    }
    return res.redirect(image.location);
  }
);

module.exports = router;
