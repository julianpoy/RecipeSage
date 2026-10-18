import { ErrorHandlers } from "../httpErrorHandler";
import { ActionsBase, RouterInputs, RouterOutputs } from "./ActionsBase";

class MessagesActions extends ActionsBase {
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

export const messagesActions = new MessagesActions();
