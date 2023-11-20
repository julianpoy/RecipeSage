import * as express from "express";
const router = express.Router();
import * as Sentry from "@sentry/node";

// DB
import { sequelize, StripePayment } from "../models/index.js";

// Service
import * as MiddlewareService from "../services/middleware.js";
import * as StripeService from "../services/stripe.js";
import * as SubscriptionService from "../services/subscriptions.js";

// Util
import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";
import {
  BadRequest,
  PreconditionFailed,
  InternalServerError,
} from "../utils/errors.js";

router.post(
  "/stripe/custom-session",
  MiddlewareService.validateSession(["user"], true),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (process.env.NODE_ENV === "selfhost") {
      throw InternalServerError("Selfhost cannot use payments");
    }

    const { isRecurring, amount, successUrl, cancelUrl } = req.body;

    if (isRecurring && amount < 100) {
      throw PreconditionFailed("Minimum is $1 due to transaction fees, sorry!");
    }
    if (!isRecurring && amount < 500) {
      throw PreconditionFailed("Minimum is $5 due to transaction fees, sorry!");
    }

    let stripeCustomerId;
    if (res.locals.session) {
      stripeCustomerId = await StripeService.createOrRetrieveCustomerId(
        res.locals.session.userId,
      );
    }

    const stripeSession = await StripeService.createPYOSession(isRecurring, {
      stripeCustomerId,
      amount,
      successUrl,
      cancelUrl,
    });

    res.status(200).json({
      id: stripeSession.id,
    });
  }),
);

router.post(
  "/stripe/webhooks",
  wrapRequestWithErrorHandler(async (req, res) => {
    if (process.env.NODE_ENV === "selfhost") {
      throw InternalServerError("Selfhost cannot use payments");
    }

    const stripeSignature = req.headers["stripe-signature"];

    let event;

    try {
      event = StripeService.validateEvent(req.rawBody, stripeSignature);
    } catch (err) {
      console.log("stripe webhook validation error", err);
      Sentry.captureException(err);
      throw BadRequest(`Webhook Error: ${err.message}`);
    }

    // One-time payments
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // Allow invoice payment_succeeded to handle subscription payments
      if (session.mode !== "subscription") {
        const user = await StripeService.findCheckoutUser(
          session.customer,
          session.customer_email,
        );

        const amountPaid = session.display_items
          .map((item) => item.amount)
          .reduce((a, b) => a + b);

        await sequelize.transaction(async (transaction) => {
          await StripePayment.create(
            {
              userId: user ? user.id : null,
              amountPaid,
              customerId: session.customer,
              customerEmail:
                session.customer_email || (user || {}).email || null,
              paymentIntentId: session.payment_intent,
              invoiceBlob: session,
            },
            {
              transaction,
            },
          );

          if (user) {
            await SubscriptionService.extend(
              user.id,
              "pyo-single",
              transaction,
            );
          }
        });
      }
    }

    // Recurring payments
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;

      const user = await StripeService.findCheckoutUser(
        invoice.customer,
        invoice.customer_email,
      );

      await sequelize.transaction(async (transaction) => {
        await StripePayment.create(
          {
            userId: user ? user.id : null,
            amountPaid: invoice.amount_paid,
            customerId: invoice.customer,
            customerEmail: invoice.customer_email || (user || {}).email || null,
            paymentIntentId: invoice.payment_intent,
            subscriptionId: invoice.subscription || null,
            invoiceBlob: invoice,
          },
          {
            transaction,
          },
        );

        if (user) {
          await Promise.all(
            invoice.lines.data.map(async (lineItem) => {
              const subscriptionModelName = lineItem.plan.product;
              await SubscriptionService.extend(
                user.id,
                subscriptionModelName,
                transaction,
              );
            }),
          );
        }
      });
    }

    res.status(200).json({ received: true });
  }),
);

export default router;
