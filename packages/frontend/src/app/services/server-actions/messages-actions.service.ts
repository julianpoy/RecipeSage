import { Injectable } from "@angular/core";

import { ErrorHandlers } from "../http-error-handler.service";
import { ActionsBase, RouterInputs, RouterOutputs } from "./actions-base";

@Injectable({
  providedIn: "root",
})
export class MessagesActionsService extends ActionsBase {
  getThreads(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["messages"]["getThreads"] | undefined> {
    return this.passThrough(
      () => this.trpc.messages.getThreads.query(),
      errorHandlers,
    );
  }

  getThread(
    input: RouterInputs["messages"]["getThread"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["messages"]["getThread"] | undefined> {
    return this.passThrough(
      () => this.trpc.messages.getThread.query(input),
      errorHandlers,
    );
  }

  createMessage(
    input: RouterInputs["messages"]["createMessage"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["messages"]["createMessage"] | undefined> {
    return this.passThrough(
      () => this.trpc.messages.createMessage.mutate(input),
      errorHandlers,
    );
  }
}
