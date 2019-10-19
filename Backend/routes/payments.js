var express = require('express');
var router = express.Router();
var Raven = require('raven');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var User = require('../models').User;

// Service
var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');
var StripeService = require('../services/stripe');
var PaypalService = require('../services/paypal');

router.post('/stripe/custom-session',
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  async (req, res, next) => {

  const { isRecurring, amount, successUrl, cancelUrl } = req.body;

  if (amount < 100) return res.status(412).send("Minimum is $1 due to transaction fees, sorry!");

  const stripeSession = await StripeService.createSession(isRecurring, {
    email: res.locals.user.email,
    amount,
    successUrl,
    cancelUrl
  });

  res.status(200).json({
    id: stripeSession.id
  });
});

router.post('/paypal/webhooks', async (req, res, next) => {
  try {
    await PaypalService.verifyWebhook(req.headers, req.body, req.body.id);

    console.log("ok!")
  } catch (e) {
    console.log(e)
    next(e);
  }
})

module.exports = router;
