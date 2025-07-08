import { stripe } from "./stripe";

export async function createSinglePYOSession(args: {
  amount: number;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return await stripe.checkout.sessions.create({
    mode: "payment",
    customer: args.stripeCustomerId || undefined,
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: args.amount,
          product_data: {
            name: "RecipeSage",
            description: "A one-time RecipeSage contribution",
          },
        },
        quantity: 1,
      },
    ],
  });
}
