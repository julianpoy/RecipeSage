import {
  prisma,
  messageSummary,
  messageThreadDTOSchema,
  userPublic,
  type MessageThreadDTO,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { convertPrismaMessageToMessageSummary } from "@recipesage/util/server/db";

export const getThreads = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/messages/getThreads",
      tags: ["messages"],
      summary: "List the current user's message threads grouped by other user",
      protect: true,
    },
  })
  .output(z.array(messageThreadDTOSchema))
  .query(async ({ ctx }) => {
    const userId = ctx.session.userId;

    const latestMessageRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT ON (partner_id) id
      FROM (
        SELECT
          id,
          "createdAt",
          CASE
            WHEN "fromUserId" = ${userId}::uuid THEN "toUserId"
            ELSE "fromUserId"
          END AS partner_id
        FROM "Messages"
        WHERE "fromUserId" = ${userId}::uuid OR "toUserId" = ${userId}::uuid
      ) AS conversation
      ORDER BY partner_id, "createdAt" DESC, id DESC
    `;

    const latestMessageIds = latestMessageRows.map((row) => row.id);
    if (!latestMessageIds.length) return [];

    const messages = await prisma.message.findMany({
      where: {
        id: {
          in: latestMessageIds,
        },
      },
      ...messageSummary,
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
    });

    const partnerIds = messages.map((message) =>
      message.fromUserId === userId ? message.toUserId : message.fromUserId,
    );

    const partners = await prisma.user.findMany({
      where: {
        id: {
          in: partnerIds,
        },
      },
      ...userPublic,
    });
    const partnersById = new Map(
      partners.map((partner) => [partner.id, partner]),
    );

    const threads: MessageThreadDTO[] = [];
    for (const message of messages) {
      const partnerId =
        message.fromUserId === userId ? message.toUserId : message.fromUserId;
      const otherUser = partnersById.get(partnerId);
      if (!otherUser) continue;

      threads.push({
        otherUser,
        latestMessage: convertPrismaMessageToMessageSummary(message),
      });
    }

    return threads;
  });
