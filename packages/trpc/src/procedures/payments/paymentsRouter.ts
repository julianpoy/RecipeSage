import { router } from "../../trpc";
import { createStripeCheckoutSession } from "./createStripeCheckoutSession";

export const paymentsRouter = router({
  createStripeCheckoutSession,
});
