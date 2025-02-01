import { TRPCClientError } from "@trpc/client";
import { Injectable } from "@angular/core";
import {
  ErrorHandlers,
  HttpErrorHandlerService,
} from "./http-error-handler.service";
import { trpcClient } from "../utils/trpcClient";

@Injectable({
  providedIn: "root",
})
export class TRPCService {
  public trpc = trpcClient;

  constructor(private httpErrorHandler: HttpErrorHandlerService) {}

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
