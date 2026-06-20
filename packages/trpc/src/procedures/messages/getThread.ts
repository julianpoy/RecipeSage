import {
  prisma,
  messageSummary,
  messageSummarySchema,
  messageThreadDTOSchema,
  userPublic,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { convertPrismaMessagesToMessageSummaries } from "@recipesage/util/server/db";

const DEFAULT_MESSAGE_LIMIT = 100;

export const getThread = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/messages/getThread",
      tags: ["messages"],
      summary: "Get a conversation with another user and its messages",
      protect: true,
    },
  })
  .input(
    z.object({
      userId: z.uuid(),
      messageLimit: z.number().int().min(1).max(500).optional(),
    }),
  )
  .output(
    z.object({
      messageThread: messageThreadDTOSchema,
      messages: z.array(messageSummarySchema),
    }),
  )
  .query(async ({ ctx, input }) => {
    const otherUser = await prisma.user.findUnique({
      where: {
        id: input.userId,
      },
      ...userPublic,
    });

    if (!otherUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Could not find user under that ID.",
      });
    }

    const where = {
      OR: [
        {
          fromUserId: input.userId,
          toUserId: ctx.session.userId,
        },
        {
          fromUserId: ctx.session.userId,
          toUserId: input.userId,
        },
      ],
    };

    const prismaMessages = await prisma.message.findMany({
      where,
      ...messageSummary,
      orderBy: {
        createdAt: "desc",
      },
      take: input.messageLimit ?? DEFAULT_MESSAGE_LIMIT,
    });

    const messages = convertPrismaMessagesToMessageSummaries(
      prismaMessages.reverse(),
    );
    const latestMessage = messages.length
      ? messages[messages.length - 1]
      : null;

    return {
      messageThread: {
        otherUser,
        latestMessage,
      },
      messages,
    };
  });
