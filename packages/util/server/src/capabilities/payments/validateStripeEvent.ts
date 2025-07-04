import * as Sentry from "@sentry/node";
import { stripe } from "./stripe";

export function validateStripeEvent(
  rawRequestBody: string | Buffer,
  stripeSignature: string | Buffer,
) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn("No Stripe webhook secret provided");
    Sentry.captureMessage("No Stripe webhook secret provided");
  }

  return stripe.webhooks.constructEvent(
    rawRequestBody,
    stripeSignature,
    process.env.STRIPE_WEBHOOK_SECRET || "no_key_provided",
  );
}
