import { TRPCClientError, createTRPCProxyClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@recipesage/trpc";
import { Injectable } from "@angular/core";
import superjson from "superjson";
import {
  ErrorHandlers,
  HttpErrorHandlerService,
} from "./http-error-handler.service";
import { UtilService } from "./util.service";

@Injectable({
  providedIn: "root",
})
export class TRPCService {
  public trpc = createTRPCProxyClient<AppRouter>({
    links: [
      httpLink({
        url: this.utilService.getBase() + "trpc",
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

  constructor(
    private httpErrorHandler: HttpErrorHandlerService,
    private utilService: UtilService,
  ) {}

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
