import type Stripe from "stripe";
import { stripe } from "./stripe";

const STRIPE_PRICE_CACHE_TTL_MINUTES = 10;
let stripePriceCache: Stripe.Price[] | null = null;
setInterval(
  () => {
    stripePriceCache = null;
  },
  STRIPE_PRICE_CACHE_TTL_MINUTES * 60 * 1000,
);

export async function getStripePrices() {
  if (stripePriceCache) {
    return stripePriceCache;
  } else {
    const prices: Stripe.Price[] = [];

    while (true) {
      const page = await stripe.prices.list({
        limit: 100,
        starting_after: prices.at(-1)?.id,
      });

      prices.push(...page.data);

      if (!page.has_more) {
        break;
      }
    }

    stripePriceCache = prices;

    return prices;
  }
}
