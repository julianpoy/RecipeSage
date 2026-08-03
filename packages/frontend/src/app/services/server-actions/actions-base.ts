import { Signal, inject, signal } from "@angular/core";
import * as Sentry from "@sentry/browser";
import { TRPCClientError } from "@trpc/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@recipesage/trpc";

import { TRPCService } from "../trpc.service";
import { ErrorHandlers } from "../http-error-handler.service";
import { SyncService } from "../sync.service";
import { SearchService } from "../search.service";
import { offlineModeState } from "../offlineModeState";

const SLOW_READ_PROMPT_MS = 5_000;

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export type RefreshableSignal<T> = {
  value: Signal<T | undefined>;
  refresh: () => Promise<void>;
};

export type ExecuteQueryOptions = {
  timeoutMs?: number;
  promptOnSlowRead?: boolean;
};

export abstract class ActionsBase {
  protected trpcService = inject(TRPCService);
  protected syncService = inject(SyncService);
  protected searchService = inject(SearchService);

  protected get trpc() {
    return this.trpcService.trpc;
  }

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
    if (!(error instanceof TRPCClientError)) return true;
    const statusCode = error.data?.httpStatus;
    if (statusCode === undefined) return true;
    return statusCode >= 500;
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
          (result) => ({ kind: "network" as const, result }),
          (error) => ({ kind: "network-error" as const, error }),
        ),
        timeoutPromise.then(() => ({ kind: "timeout" as const })),
        offlineWaiter.promise.then(() => ({ kind: "offline" as const })),
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
        return this.trpcService.handle(
          Promise.reject(winner.error),
          errorHandlers,
        );
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
        return this.trpcService.handle(Promise.reject(e), errorHandlers);
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
      return this.trpcService.handle(Promise.reject(e), errorHandlers);
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
      return this.trpcService.handle(Promise.reject(e), errorHandlers);
    }
  }

  protected passThrough<T>(
    invoke: () => Promise<T>,
    errorHandlers?: ErrorHandlers,
  ): Promise<T | undefined> {
    if (offlineModeState.enabled) {
      return Promise.resolve(this.handleOfflineModeBlocked(errorHandlers));
    }
    return this.trpcService.handle(invoke(), errorHandlers);
  }

  protected executeQueryAsSignal<T>(
    invoke: () => Promise<T>,
    fallback: () => Promise<T | undefined>,
    errorHandlers?: ErrorHandlers,
  ): RefreshableSignal<T> {
    const result = signal<T | undefined>(undefined);
    let generation = 0;

    const run = (): Promise<void> => {
      const myGeneration = ++generation;
      const isCurrent = () => myGeneration === generation;

      const networkPromise = invoke();

      const slowHandle = setTimeout(() => {
        offlineModeState.notifySlowRead();
      }, SLOW_READ_PROMPT_MS);

      const cachePromise = fallback().catch((fe) => {
        console.warn("Local fallback failed", fe);
        return undefined;
      });

      void cachePromise.then((cached) => {
        if (!isCurrent()) return;
        if (cached !== undefined && result() === undefined) {
          result.set(cached);
        }
      });

      return networkPromise.then(
        (fresh) => {
          clearTimeout(slowHandle);
          if (!isCurrent()) return;
          result.set(fresh);
        },
        async (e) => {
          clearTimeout(slowHandle);
          if (!isCurrent()) return;
          await cachePromise;
          if (!isCurrent()) return;
          if (result() === undefined || !this.shouldAttemptFallback(e)) {
            this.trpcService.handle(Promise.reject(e), errorHandlers);
          } else {
            console.warn("Network fetch failed; using cached value", e);
          }
        },
      );
    };

    void run();

    return { value: result.asReadonly(), refresh: run };
  }
}
