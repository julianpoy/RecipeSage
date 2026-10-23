import type Stripe from "stripe";
import { stripe } from "./stripe";

export async function getStripePrice(
  id: string,
): Promise<Stripe.Response<Stripe.Price>> {
  return stripe.prices.retrieve(id);
}
