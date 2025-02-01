import { Session } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// TODO: turn this into an authenticated procedure
export function validateTrpcSession(
  session: Session | null,
): asserts session is Session {
  if (!session) {
    throw new TRPCError({
      message: "Must be logged in",
      code: "UNAUTHORIZED",
    });
  }
}
