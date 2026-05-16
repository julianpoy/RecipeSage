import { publicProcedure } from "../../trpc";
import { Assistant } from "@recipesage/util/server/ml";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { assistantMessageSummarySchema } from "@recipesage/prisma";

const assistant = new Assistant();

export const getAssistantMessages = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/assistant/getAssistantMessages",
      tags: ["assistant"],
      summary: "Get the caller's assistant chat history",
      protect: true,
    },
  })
  .output(z.array(assistantMessageSummarySchema))
  .query(async ({ ctx }) => {
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
