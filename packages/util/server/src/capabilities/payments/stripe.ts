import Stripe from "stripe";
import { config } from "../../general/config";
export const stripe = new Stripe(config.stripe.sk);
