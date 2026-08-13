import * as Sentry from "@sentry/node";
import { stripe } from "./stripe";
import { config } from "../../general";

export function validateStripeEvent(
  rawRequestBody: string | Buffer,
  stripeSignature: string | Buffer,
) {
  if (!config.stripe.webhookSecret) {
    console.warn("No Stripe webhook secret provided");
    Sentry.captureMessage("No Stripe webhook secret provided");
  }

  return stripe.webhooks.constructEvent(
    rawRequestBody,
    stripeSignature,
    config.stripe.webhookSecret || "no_key_provided",
  );
}
