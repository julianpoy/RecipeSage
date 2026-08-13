import { config } from "../../general";
import { stripe } from "./stripe";

export async function createYearlyPYOSession(args: {
  amount: number;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
  currency?: string;
}) {
  const currency = args.currency || "usd";
  let lookupKey = `pyo-yearly-${args.amount}`;

  if (args.currency !== "usd") {
    lookupKey += args.currency;
  }

  let price = (
    await stripe.prices.list({
      lookup_keys: [lookupKey],
    })
  ).data.at(0);

  if (!price) {
    price = await stripe.prices.create({
      unit_amount: args.amount,
      recurring: {
        interval: "year",
      },
      product: config.stripe.productId.yearly,
      currency,
      lookup_key: lookupKey,
    });
  }

  return await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: args.stripeCustomerId || undefined,
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
