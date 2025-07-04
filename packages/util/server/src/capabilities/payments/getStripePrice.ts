import { stripe } from "./stripe";

export async function getStripePrice(id: string) {
  return stripe.prices.retrieve(id);
}
