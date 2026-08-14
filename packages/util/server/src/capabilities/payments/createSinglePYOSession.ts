import { config } from "../../general";
import { stripe } from "./stripe";

export async function createSinglePYOSession(args: {
  amount: number;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
  currency?: string;
}) {
  const lookupKey = `pyo-single-${args.amount}`;

  let price = (
    await stripe.prices.list({
      lookup_keys: [lookupKey],
    })
  ).data.at(0);

  if (!price) {
    price = await stripe.prices.create({
      unit_amount: args.amount,
      product: config.stripe.productId.onetime,
      currency: args.currency || "usd",
      lookup_key: lookupKey,
    });
  }

  return await stripe.checkout.sessions.create({
    mode: "payment",
    customer: args.stripeCustomerId || undefined,
    customer_creation: args.stripeCustomerId ? undefined : "always",
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    managed_payments: {
      enabled: config.stripe.enableManagedPayments,
    },
  });
}
