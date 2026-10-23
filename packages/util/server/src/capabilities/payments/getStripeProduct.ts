import type Stripe from "stripe";
import { stripe } from "./stripe";

export async function getStripeProduct(
  id: string,
): Promise<Stripe.Response<Stripe.Product>> {
  return stripe.products.retrieve(id);
}
