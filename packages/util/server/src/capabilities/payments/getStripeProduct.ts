import { stripe } from "./stripe";

export async function getStripeProduct(id: string) {
  return stripe.products.retrieve(id);
}
