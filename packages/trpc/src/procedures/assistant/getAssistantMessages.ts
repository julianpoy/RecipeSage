import { publicProcedure } from "../../trpc";
import { Assistant } from "@recipesage/util/server/ml";
import { TRPCError } from "@trpc/server";

const assistant = new Assistant();

export const getAssistantMessages = publicProcedure.query(async ({ ctx }) => {
  const session = ctx.session;
  if (!session) {
    throw new TRPCError({
      message: "Must be logged in",
      code: "UNAUTHORIZED",
    });
  }

  const chatHistory = await assistant.getChatHistory(session.userId);

  return chatHistory;
});
