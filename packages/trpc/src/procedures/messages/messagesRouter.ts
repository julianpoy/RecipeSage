import { router } from "../../trpc";
import { createMessage } from "./createMessage";
import { getThread } from "./getThread";
import { getThreads } from "./getThreads";

export const messagesRouter = router({
  createMessage,
  getThread,
  getThreads,
});
