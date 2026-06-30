import { TRPCError } from "@trpc/server";
import {
  assertCreditsAvailable,
  CreditLimitExceededError,
  CreditOperation,
} from "../general";

export const assertCreditsAvailableTrpc = async (
  userId: string,
  operation: CreditOperation,
): Promise<void> => {
  try {
    await assertCreditsAvailable(userId, operation);
  } catch (e) {
    if (e instanceof CreditLimitExceededError) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: e.message,
        cause: e,
      });
    }
    throw e;
  }
};
