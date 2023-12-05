import { Session } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export function validateSession(
  session: Session | null,
): asserts session is Session {
  if (!session) {
    throw new TRPCError({
      message: "Must be logged in",
      code: "UNAUTHORIZED",
    });
  }
}
