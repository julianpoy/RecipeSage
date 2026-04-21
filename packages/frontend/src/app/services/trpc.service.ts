import { TRPCClientError } from "@trpc/client";
import { Injectable, PendingTasks, inject } from "@angular/core";
import {
  ErrorHandlers,
  HttpErrorHandlerService,
} from "./http-error-handler.service";
import { trpcClient } from "../utils/trpcClient";

@Injectable({
  providedIn: "root",
})
export class TRPCService {
  private httpErrorHandler = inject(HttpErrorHandlerService);
  private pendingTasks = inject(PendingTasks);

  public trpc = trpcClient;

  async handle<T>(result: Promise<T>, errorHandlers?: ErrorHandlers) {
    const handledResult = result.catch((e) => {
      if (e instanceof TRPCClientError) {
        this.httpErrorHandler.handleTrpcError(e, errorHandlers);
      } else {
        throw e;
      }
    });

    this.pendingTasks.run(() => {
      return handledResult;
    });

    return handledResult;
  }
}
