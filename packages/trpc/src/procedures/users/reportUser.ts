import { prisma, UserReportStatus } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const reportUser = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/reportUser",
      tags: ["users"],
      summary: "Report another user for moderator review",
      protect: true,
    },
  })
  .input(
    z.object({
      userId: z.uuid(),
      reason: z.string().min(5).max(2000),
    }),
  )
  .output(
    z.object({
      reported: z.literal(true),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    if (input.userId === ctx.session.userId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You can't report yourself",
      });
    }

    const reportedUser = await prisma.user.findUnique({
      where: {
        id: input.userId,
      },
      select: {
        id: true,
      },
    });
    if (!reportedUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No user found with that id",
      });
    }

    const reason = input.reason.trim();

    await prisma.userReport.upsert({
      where: {
        reportedUserId_reporterUserId: {
          reportedUserId: reportedUser.id,
          reporterUserId: ctx.session.userId,
        },
      },
      create: {
        reportedUserId: reportedUser.id,
        reporterUserId: ctx.session.userId,
        reason,
      },
      update: {
        reason,
        status: UserReportStatus.OPEN,
      },
    });

    return {
      reported: true,
    };
  });
