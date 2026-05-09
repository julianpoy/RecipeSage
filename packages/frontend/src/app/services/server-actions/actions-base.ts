import { Signal, inject, signal } from "@angular/core";
import * as Sentry from "@sentry/browser";
import { TRPCClientError } from "@trpc/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@recipesage/trpc";

import { TRPCService } from "../trpc.service";
import { ErrorHandlers } from "../http-error-handler.service";
import { SyncService } from "../sync.service";
import { SearchService } from "../search.service";

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export type RefreshableSignal<T> = {
  value: Signal<T | undefined>;
  refresh: () => void;
};

export abstract class ActionsBase {
  protected trpcService = inject(TRPCService);
  protected syncService = inject(SyncService);
  protected searchService = inject(SearchService);

  protected get trpc() {
    return this.trpcService.trpc;
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
    timeoutMs: number = 10000,
  ): Promise<T | undefined> {
    const networkPromise = invoke();
    networkPromise.catch(() => {});

    const timeoutSentinel = Symbol("executeQueryTimeout");
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<typeof timeoutSentinel>((resolve) => {
      timeoutHandle = setTimeout(() => resolve(timeoutSentinel), timeoutMs);
    });

    const winner = await Promise.race([
      networkPromise.then(
        (result) => ({ kind: "network" as const, result }),
        (error) => ({ kind: "network-error" as const, error }),
      ),
      timeoutPromise.then(() => ({ kind: "timeout" as const })),
    ]);

    if (winner.kind !== "timeout") {
      clearTimeout(timeoutHandle);
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
  }

  protected async executeMutation<T>(
    invoke: () => Promise<T>,
    onSuccess: (result: T) => void,
    errorHandlers?: ErrorHandlers,
  ): Promise<T | undefined> {
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
    return this.trpcService.handle(invoke(), errorHandlers);
  }

  protected executeQueryAsSignal<T>(
    invoke: () => Promise<T>,
    fallback: () => Promise<T | undefined>,
    errorHandlers?: ErrorHandlers,
  ): RefreshableSignal<T> {
    const result = signal<T | undefined>(undefined);
    let generation = 0;

    const run = () => {
      const myGeneration = ++generation;
      const isCurrent = () => myGeneration === generation;

      const networkPromise = invoke();
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

      void networkPromise.then(
        (fresh) => {
          if (!isCurrent()) return;
          result.set(fresh);
        },
        async (e) => {
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

    run();

    return { value: result.asReadonly(), refresh: run };
  }
}
