import { ErrorHandlers } from "../httpErrorHandler";
import { ActionsBase, RouterInputs, RouterOutputs } from "./ActionsBase";
import { getLocalDb, ObjectStoreName } from "../../utils/localDb";

class AssistantActions extends ActionsBase {
  getAssistantMessages(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["assistant"]["getAssistantMessages"] | undefined> {
    return this.executeQuery(
      () => this.trpc.assistant.getAssistantMessages.query(),
      async () => {
        const localDb = await getLocalDb();
        return localDb.getAll(ObjectStoreName.AssistantMessages);
      },
      errorHandlers,
    );
  }

  sendAssistantMessage(
    input: RouterInputs["assistant"]["sendAssistantMessage"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["assistant"]["sendAssistantMessage"] | undefined> {
    return this.passThrough(
      () => this.trpc.assistant.sendAssistantMessage.query(input),
      errorHandlers,
    );
  }
}

export const assistantActions = new AssistantActions();
