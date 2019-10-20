var express = require('express');
var router = express.Router();
var Raven = require('raven');
const moment = require('moment');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var User = require('../models').User;
var StripePayment = require('../models').StripePayment;

// Service
var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');
var StripeService = require('../services/stripe');
var PaypalService = require('../services/paypal');
var SubscriptionService = require('../services/subscriptions');

router.post('/stripe/custom-session',
  MiddlewareService.validateSession(['user'], true),
  async (req, res, next) => {
  try {
    const { isRecurring, amount, successUrl, cancelUrl } = req.body;

    if (amount < 100) return res.status(412).send("Minimum is $1 due to transaction fees, sorry!");

    let stripeCustomerId;
    if (res.locals.session.userId) {
      stripeCustomerId = await StripeService.createOrRetrieveCustomerId(res.locals.session.userId);
    }

    const stripeSession = await StripeService.createPYOSession(isRecurring, {
      stripeCustomerId,
      amount,
      successUrl,
      cancelUrl
    });

    res.status(200).json({
      id: stripeSession.id
    });
  } catch(e) {
    next(e);
  }
});

router.post('/stripe/webhooks', async (req, res, next) => {
  try {
    const stripeSignature = req.headers['stripe-signature'];

    let event;

    try {
      event = StripeService.validateEvent(req.rawBody, stripeSignature);
    } catch (err) {
      console.log("stripe webhook validation error", err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // One-time payments
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Allow invoice payment_succeeded to handle subscription payments
      if (session.mode !== "subscription") {
        const user = await StripeService.findCheckoutUser(session.customer, session.customer_email);

        const amountPaid = session.display_items.map(item => item.amount).reduce((a, b) => a + b);

        await SQ.transaction(async t => {
          await StripePayment.create({
            userId: user ? user.id : null,
            amountPaid,
            customerId: session.customer,
            customerEmail: session.customer_email || (user || {}).email || null,
            paymentIntentId: session.payment_intent,
            invoiceBlob: session
          }, {
            transaction: t
          });

          if (user) {
            await SubscriptionService.extend(user.id, 'pyo-single', false, t);
          }
        });
      }
    }

    // Recurring payments
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;

      const user = await StripeService.findCheckoutUser(invoice.customer, invoice.customer_email);

      await SQ.transaction(async t => {
        await StripePayment.create({
          userId: user ? user.id : null,
          amountPaid: invoice.amount_paid,
          customerId: invoice.customer,
          customerEmail: invoice.customer_email || (user || {}).email || null,
          paymentIntentId: invoice.payment_intent,
          subscriptionId: invoice.subscription || null,
          invoiceBlob: invoice
        }, {
          transaction: t
        });

        if (user) {
          await Promise.all(invoice.lines.data.map(async lineItem => {
            const subscriptionModelName = lineItem.plan.product;
            await SubscriptionService.extend(user.id, subscriptionModelName, true, t);
          }));
        }
      });
    }

    res.status(200).json({ received: true });
  } catch(e) {
    next(e);
  }
})

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
