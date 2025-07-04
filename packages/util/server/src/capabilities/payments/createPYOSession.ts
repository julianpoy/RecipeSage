import { createRecurringPYOSession } from "./createRecurringPYOSession";
import { createSinglePYOSession } from "./createSinglePYOSession";

export function createPYOSession(args: {
  isRecurring: boolean;
  amount: number;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  if (args.isRecurring) {
    return createRecurringPYOSession(args);
  } else {
    return createSinglePYOSession(args);
  }
}
