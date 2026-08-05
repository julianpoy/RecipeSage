import {
  labelGroupSummary,
  labelGroupSummarySchema,
  Prisma,
  prisma,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const updateLabelGroup = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/labelGroups/updateLabelGroup",
      tags: ["labelGroups"],
      summary: "Update a label group",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
      title: z.string().min(1).max(254),
      labelIds: z.array(z.uuid()),
      warnWhenNotPresent: z.boolean(),
    }),
  )
  .output(labelGroupSummarySchema)
  .mutation(async ({ ctx, input }) => {
    const labelGroup = await prisma.$transaction(async (tx) => {
      const existingLabelGroup = await tx.labelGroup.findFirst({
        where: {
          id: {
            not: input.id,
          },
          userId: ctx.session.userId,
          title: input.title,
        },
      });

      if (existingLabelGroup) {
        throw new TRPCError({
          message: "Conflicting labelGroup title",
          code: "CONFLICT",
        });
      }

      try {
        await tx.labelGroup.update({
          where: {
            userId: ctx.session.userId,
            id: input.id,
          },
          data: {
            title: input.title,
            warnWhenNotPresent: input.warnWhenNotPresent,
          },
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          throw new TRPCError({
            message: "Conflicting labelGroup title",
            code: "CONFLICT",
          });
        }
        throw e;
      }

      await tx.label.updateMany({
        where: {
          userId: ctx.session.userId,
          labelGroupId: input.id,
        },
        data: {
          labelGroupId: null,
        },
      });

      await tx.label.updateMany({
        where: {
          userId: ctx.session.userId,
          id: {
            in: input.labelIds,
          },
        },
        data: {
          labelGroupId: input.id,
        },
      });

      return tx.labelGroup.findUniqueOrThrow({
        where: {
          userId: ctx.session.userId,
          id: input.id,
        },
        ...labelGroupSummary,
      });
    });

    return labelGroup;
  });
