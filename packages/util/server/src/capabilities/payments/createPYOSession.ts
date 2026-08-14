import { createMonthlyPYOSession } from "./createMonthlyPYOSession";
import { createYearlyPYOSession } from "./createYearlyPYOSession";
import { createSinglePYOSession } from "./createSinglePYOSession";

export function createPYOSession(args: {
  frequency: "monthly" | "yearly" | "single";
  amount: number;
  stripeCustomerId?: string;
  successUrl: string;
  cancelUrl: string;
  currency?: string;
}) {
  if (args.frequency === "monthly") {
    return createMonthlyPYOSession(args);
  } else if (args.frequency === "yearly") {
    return createYearlyPYOSession(args);
  } else {
    return createSinglePYOSession(args);
  }
}
