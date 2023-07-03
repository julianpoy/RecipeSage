import {
  TRPCClientError,
  createTRPCProxyClient,
  httpBatchLink,
} from "@trpc/client";
import type { AppRouter } from "@recipesage/trpc";
import { Injectable } from "@angular/core";
import superjson from "superjson";
import {
  ErrorHandlers,
  HttpErrorHandlerService,
} from "./http-error-handler.service";
import { API_BASE_URL } from "../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class TRPCService {
  public trpc = createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: (API_BASE_URL || "/api/") + "trpc",
        maxURLLength: 2047,
        headers: () => {
          const token = localStorage.getItem("token");
          return {
            Authorization: token ? `Bearer ${token}` : undefined,
          };
        },
      }),
    ],
    transformer: superjson,
  });

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
