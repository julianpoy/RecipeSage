import { TRPCLink, createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@recipesage/trpc";
import { Injectable } from "@angular/core";
import { observable } from "@trpc/server/observable";
import {
  ErrorHandlers,
  HttpErrorHandlerService,
} from "./http-error-handler.service";
import { API_BASE_URL } from "../../environments/environment";

const customLink: TRPCLink<AppRouter> = () => {
  // here we just got initialized in the app - this happens once per app
  // useful for storing cache for instance
  return ({ next, op }) => {
    // this is when passing the result to the next link
    // each link needs to return an observable which propagates results
    return observable((observer) => {
      console.log("performing operation:", op);
      const unsubscribe = next(op).subscribe({
        next(value) {
          console.log("we received value", value);
          observer.next(value);
        },
        error(err) {
          console.log("we received error", err);
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return unsubscribe;
    });
  };
};

@Injectable({
  providedIn: "root",
})
export class TRPCService {
  public trpc = createTRPCProxyClient<AppRouter>({
    links: [
      customLink,
      httpBatchLink({
        url: (API_BASE_URL || "/api/") + "trpc",
        maxURLLength: 2047,
        headers: () => {
          return {
            Authorization: localStorage.getItem("token") || undefined,
          };
        },
      }),
    ],
    transformer: undefined,
  });

  constructor(private httpErrorHandler: HttpErrorHandlerService) {}

  // async callWithErrorHandling
  //   <T extends (args: Args) => Promise<Output>, Args, Output>
  //   (fn: T, args: Args, errorHandlers?: ErrorHandlers): Promise<Output | undefined>
  // {
  //   try {
  //     const result = await fn(args);
  //     return result;
  //   } catch(e) {
  //     if (e instanceof TRPCError) {
  //       this.httpErrorHandler.handleTrpcError(e, errorHandlers);
  //     } else {
  //       // TODO:
  //       // this.httpErrorHandler.handleTrpcError(new TRPCError, errorHandlers);
  //     }
  //   }
  // }
}
