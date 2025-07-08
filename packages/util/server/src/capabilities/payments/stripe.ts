import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_SK || "no_key_provided");
