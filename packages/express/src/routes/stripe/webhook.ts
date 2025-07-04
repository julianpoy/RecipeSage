import * as Sentry from "@sentry/node";
import { z } from "zod";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import { BadRequestError, InternalServerError } from "../../errors";
import {
  extendSubscription,
  findCheckoutUser,
  SubscriptionModelName,
  validateStripeEvent,
} from "@recipesage/util/server/capabilities";
import assert from "assert";
import { prisma } from "@recipesage/prisma";
import { metrics } from "@recipesage/util/server/general";

const schema = {
  body: z.any(),
};

export const webhookHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.None,
  },
  async (req) => {
    if (process.env.NODE_ENV === "selfhost") {
      throw new InternalServerError("Selfhost cannot use payments");
    }

    const stripeSignature = Array.isArray(req.headers["stripe-signature"])
      ? req.headers["stripe-signature"].join("")
      : req.headers["stripe-signature"];

    let event;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event = validateStripeEvent((req as any).rawBody, stripeSignature || "");
    } catch (err) {
      console.error("Stripe webhook validation error", err);
      Sentry.captureException(err);
      throw new BadRequestError();
    }

    const existingEventRecord = await prisma.stripeEvent.findUnique({
      where: {
        stripeId: event.id,
      },
    });

    if (existingEventRecord) {
      return {
        statusCode: 200,
        data: "Already handled",
      };
    }

    // Allow invoice payment_succeeded to handle subscription payments
    if (
      event.type === "checkout.session.completed" &&
      event.data.object.mode === "subscription"
    ) {
      return {
        statusCode: 200,
        data: "Not handled",
      };
    }

    // One-time payments
    if (
      event.type === "checkout.session.completed" &&
      event.data.object.mode !== "subscription"
    ) {
      const session = event.data.object;

      const stripeEmail =
        session.customer_email || session.customer_details?.email;

      assert(typeof session.customer === "string");
      assert(typeof stripeEmail === "string");

      const user = await findCheckoutUser(session.customer, stripeEmail);

      await prisma.$transaction(async (tx) => {
        // We use this to prevent duplicate webhook processing
        await tx.stripeEvent.create({
          data: {
            stripeId: event.id,
            userId: user?.id,
            blob: event,
          },
        });

        assert(typeof session.amount_total === "number");
        assert(typeof session.customer === "string");
        assert(typeof session.payment_intent === "string");

        await tx.stripePayment.create({
          data: {
            userId: user ? user.id : null,
            amountPaid: session.amount_total,
            customerId: session.customer,
            customerEmail: stripeEmail || (user || {}).email || null,
            paymentIntentId: session.payment_intent,
            invoiceBlob: session,
          },
        });

        if (user) {
          await extendSubscription(
            user.id,
            SubscriptionModelName.PyoSingle,
            tx,
          );
        } else {
          Sentry.captureMessage("Payment collected for unknown user", {
            extra: {
              type: event.type,
              stripeSession: session,
            },
          });
        }
      });

      metrics.stripeWebhookSuccess.inc({
        eventType: event.type,
      });

      return {
        statusCode: 200,
        data: "Ok",
      };
    }

    // Recurring payments
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;

      assert(typeof invoice.customer === "string");
      assert(typeof invoice.customer_email === "string");

      const user = await findCheckoutUser(
        invoice.customer,
        invoice.customer_email,
      );

      await prisma.$transaction(async (tx) => {
        // We use this to prevent duplicate webhook processing
        await tx.stripeEvent.create({
          data: {
            stripeId: event.id,
            userId: user?.id,
            blob: event,
          },
        });

        const subscription = invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof subscription === "string" ? subscription : subscription?.id;

        assert(typeof invoice.customer === "string");

        await tx.stripePayment.create({
          data: {
            userId: user ? user.id : null,
            amountPaid: invoice.amount_paid,
            customerId: invoice.customer,
            customerEmail: invoice.customer_email || (user || {}).email || null,
            subscriptionId: subscriptionId,
            invoiceBlob: invoice,
          },
        });

        if (user) {
          await extendSubscription(
            user.id,
            SubscriptionModelName.PyoMonthly,
            tx,
          );
        } else {
          console.warn("Payment collected for unknown user");
          Sentry.captureMessage("Payment collected for unknown user", {
            extra: {
              type: event.type,
              stripeInvoice: invoice,
            },
          });
        }
      });

      metrics.stripeWebhookSuccess.inc({
        eventType: event.type,
      });

      return {
        statusCode: 200,
        data: "Ok",
      };
    }

    Sentry.captureMessage(
      "Received Stripe webhook with no corresponding handler",
      {
        extra: {
          eventType: event.type,
        },
      },
    );

    return {
      statusCode: 400,
      data: "Not handled",
    };
  },
);
