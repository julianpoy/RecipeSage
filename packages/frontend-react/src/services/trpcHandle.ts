import { TRPCClientError } from "@trpc/client";
import { httpErrorHandler, type ErrorHandlers } from "./httpErrorHandler";

export const trpcHandle = async <T>(
  result: Promise<T>,
  errorHandlers?: ErrorHandlers,
): Promise<T | undefined> =>
  result.catch((e) => {
    if (e instanceof TRPCClientError) {
      httpErrorHandler.handleTrpcError(e, errorHandlers);
      return undefined;
    }
    throw e;
  });
