import { TRPCClientError } from "@trpc/client";
import { Injectable, inject } from "@angular/core";
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

  public trpc = trpcClient;

  async handle<T>(result: Promise<T>, errorHandlers?: ErrorHandlers) {
    return result.catch((e) => {
      if (e instanceof TRPCClientError) {
        this.httpErrorHandler.handleTrpcError(e, errorHandlers);
      } else {
        throw e;
      }
    });
  }
}
