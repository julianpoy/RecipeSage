import { TRPCClientError } from "@trpc/client";
import { createTrpc } from "./trpc";

export type ValidateSessionResult = "valid" | "invalid" | "unknown";

export const validateSession = async (
  apiBase: string,
  token: string,
): Promise<ValidateSessionResult> => {
  const trpc = createTrpc(apiBase, token);
  try {
    await trpc.users.validateSession.query();
    return "valid";
  } catch (e) {
    if (e instanceof TRPCClientError && e.data?.httpStatus === 401) {
      return "invalid";
    }
    return "unknown";
  }
};
