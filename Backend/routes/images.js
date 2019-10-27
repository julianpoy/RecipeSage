var express = require('express');
var router = express.Router();
var Raven = require('raven');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var User = require('../models').User;
var Recipe = require('../models').Recipe;
var Label = require('../models').Label;
var Image = require('../models').Image;

// Service
var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');
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
    if (req.body.url) {
      try {
        file = await UtilService.sendURLToS3(req.body.imageURL, encodeInHighRes);
      } catch (e) {
        e.status = 415;
        throw e;
      }
    } else {
      await UtilService.upload('image', req, res, encodeInHighRes);
      file = req.file;
    }

    if (!file) {
      return res.status(400);
    }

    const image = await Image.create({
      userId: res.locals.session.userId,
      location: file.location,
      key: file.key,
      json: file
    });

    res.status(200).send(image);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
