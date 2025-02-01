import { router } from "../../trpc";
import { getAssistantMessages } from "./getAssistantMessages";
import { sendAssistantMessage } from "./sendAssistantMessage";

export const assistantRouter = router({
  sendAssistantMessage,
  getAssistantMessages,
});
