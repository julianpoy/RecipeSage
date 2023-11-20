import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { Assistant } from "../../services/chat/assistant";
import { TRPCError } from "@trpc/server";

const assistant = new Assistant();

export const sendAssistantMessage = publicProcedure
  .input(
    z.object({
      content: z.string().max(500),
    }),
  )
  .query(async ({ ctx, input }) => {
    const session = ctx.session;
    if (!session) {
      throw new TRPCError({
        message: "Must be logged in",
        code: "UNAUTHORIZED",
      });
    }

    const isOverMessageLimit = await assistant.checkMessageLimit(
      session.userId,
    );
    if (isOverMessageLimit) {
      throw new TRPCError({
        message: "Over daily message limit",
        code: "TOO_MANY_REQUESTS",
      });
    }

    await assistant.sendChat(input.content, session.userId);

    return "ok";
  });
