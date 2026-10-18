import * as Sentry from "@sentry/react";
import { TRPCClientError } from "@trpc/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@recipesage/trpc";

import { trpcClient } from "../../utils/trpcClient";
import type { ErrorHandlers } from "../httpErrorHandler";
import { trpcHandle } from "../trpcHandle";
import { syncService } from "../syncService";
import { searchService } from "../searchService";
import { offlineModeState } from "../offlineModeState";

const SLOW_READ_PROMPT_MS = 5_000;

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export interface OfflineFirstQueryDefinition<T> {
  queryKey: readonly unknown[];
  invoke: () => Promise<T>;
  fallback: () => Promise<T | undefined>;
  errorHandlers?: ErrorHandlers;
}

type QueryRaceWinner<T> =
  | { kind: "network"; result: T }
  | { kind: "network-error"; error: unknown }
  | { kind: "timeout" }
  | { kind: "offline" };

export type ExecuteQueryOptions = {
  timeoutMs?: number;
  promptOnSlowRead?: boolean;
};

export const shouldAttemptFallback = (error: unknown): boolean => {
  if (!(error instanceof TRPCClientError)) return true;
  const statusCode = error.data?.httpStatus;
  if (statusCode === undefined) return true;
  return statusCode >= 500;
};

export abstract class ActionsBase {
  protected trpc = trpcClient;
  protected syncService = syncService;
  protected searchService = searchService;

  private async runOfflineFallback<T>(
    fallback: () => Promise<T | undefined>,
  ): Promise<T | undefined> {
    try {
      return await fallback();
    } catch (fe) {
      console.warn("Local fallback failed", fe);
      return undefined;
    }
  }

  private handleOfflineModeBlocked(errorHandlers?: ErrorHandlers): undefined {
    const handler = errorHandlers?.["0"] ?? errorHandlers?.["*"];
    if (handler) {
      handler(new Error("Offline mode enabled"));
      return undefined;
    }
    offlineModeState.showBlockedError();
    return undefined;
  }

  protected shouldAttemptFallback(error: unknown): boolean {
    return shouldAttemptFallback(error);
  }

  protected async executeQuery<T>(
    invoke: () => Promise<T>,
    fallback: () => Promise<T | undefined>,
    errorHandlers?: ErrorHandlers,
    options?: ExecuteQueryOptions,
  ): Promise<T | undefined> {
    const { timeoutMs = 10000, promptOnSlowRead = true } = options || {};

    if (offlineModeState.enabled) {
      return this.runOfflineFallback(fallback);
    }

    const networkPromise = invoke();
    networkPromise.catch(() => {});

    const slowHandle = promptOnSlowRead
      ? setTimeout(() => {
          offlineModeState.notifySlowRead();
        }, SLOW_READ_PROMPT_MS)
      : undefined;

    const offlineWaiter = offlineModeState.whenEnabled();

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), timeoutMs);
    });

    try {
      const winner = await Promise.race([
        networkPromise.then(
          (result): QueryRaceWinner<T> => ({ kind: "network", result }),
          (error): QueryRaceWinner<T> => ({ kind: "network-error", error }),
        ),
        timeoutPromise.then((): QueryRaceWinner<T> => ({ kind: "timeout" })),
        offlineWaiter.promise.then(
          (): QueryRaceWinner<T> => ({ kind: "offline" }),
        ),
      ]);

      if (winner.kind === "offline") {
        return this.runOfflineFallback(fallback);
      }

      if (winner.kind === "network") {
        return winner.result;
      }

      if (winner.kind === "network-error") {
        if (this.shouldAttemptFallback(winner.error)) {
          try {
            const fallbackResult = await fallback();
            if (fallbackResult !== undefined) {
              return fallbackResult;
            }
          } catch (fe) {
            console.warn("Local fallback failed", fe);
          }
        }
        return trpcHandle(Promise.reject(winner.error), errorHandlers);
      }

      try {
        const fallbackResult = await fallback();
        if (fallbackResult !== undefined) {
          return fallbackResult;
        }
      } catch (fe) {
        console.warn("Local fallback failed", fe);
      }

      try {
        return await networkPromise;
      } catch (e) {
        return trpcHandle(Promise.reject(e), errorHandlers);
      }
    } finally {
      clearTimeout(slowHandle);
      offlineWaiter.dispose();
    }
  }

  protected async executeMutation<T>(
    invoke: () => Promise<T>,
    onSuccess: (result: T) => void,
    errorHandlers?: ErrorHandlers,
  ): Promise<T | undefined> {
    if (offlineModeState.enabled) {
      return this.handleOfflineModeBlocked(errorHandlers);
    }
    try {
      const result = await invoke();
      onSuccess(result);
      return result;
    } catch (e) {
      return trpcHandle(Promise.reject(e), errorHandlers);
    }
  }

  protected async executeMutationWithFallback<T>(
    invoke: () => Promise<T>,
    onSuccess: (result: T) => void,
    fallback: () => Promise<T>,
    errorHandlers?: ErrorHandlers,
  ): Promise<T | undefined> {
    if (offlineModeState.enabled) {
      try {
        return await fallback();
      } catch (fe) {
        console.warn("Offline mutation fallback failed", fe);
        return this.handleOfflineModeBlocked(errorHandlers);
      }
    }
    try {
      const result = await invoke();
      onSuccess(result);
      return result;
    } catch (e) {
      if (this.shouldAttemptFallback(e)) {
        try {
          return await fallback();
        } catch (fe) {
          console.warn("Mutation fallback failed", fe);
          Sentry.captureException(fe);
        }
      }
      return trpcHandle(Promise.reject(e), errorHandlers);
    }
  }

  protected passThrough<T>(
    invoke: () => Promise<T>,
    errorHandlers?: ErrorHandlers,
  ): Promise<T | undefined> {
    if (offlineModeState.enabled) {
      return Promise.resolve(this.handleOfflineModeBlocked(errorHandlers));
    }
    return trpcHandle(invoke(), errorHandlers);
  }

  protected defineOfflineFirstQuery<T>(
    queryKey: readonly unknown[],
    invoke: () => Promise<T>,
    fallback: () => Promise<T | undefined>,
    errorHandlers?: ErrorHandlers,
  ): OfflineFirstQueryDefinition<T> {
    return { queryKey, invoke, fallback, errorHandlers };
  }
}
