import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { cleanLabelTitle } from "@recipesage/util/shared";

export const updateLabel = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/labels/updateLabel",
      tags: ["labels"],
      summary: "Update a label",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
      title: z.string().min(1).max(100).optional(),
      labelGroupId: z.uuid().nullable().optional(),
    }),
  )
  .output(z.string())
  .mutation(async ({ ctx, input }) => {
    if (!input.title && input.labelGroupId === undefined) {
      throw new TRPCError({
        message: "You must provide at least one of: title, labelGroupId",
        code: "BAD_REQUEST",
      });
    }

    const title = input.title ? cleanLabelTitle(input.title) : undefined;

    if (input.title && !title) {
      throw new TRPCError({
        message: "Label title cannot be empty",
        code: "BAD_REQUEST",
      });
    }

    if (title) {
      const existingLabel = await prisma.label.findFirst({
        where: {
          id: {
            not: input.id,
          },
          userId: ctx.session.userId,
          title,
        },
      });

      if (existingLabel) {
        throw new TRPCError({
          message: "Conflicting label title",
          code: "CONFLICT",
        });
      }
    }

    if (input.labelGroupId) {
      const labelGroup = await prisma.labelGroup.findFirst({
        where: {
          userId: ctx.session.userId,
          id: input.labelGroupId,
        },
      });

      if (!labelGroup) {
        throw new TRPCError({
          message: "Label group not found",
          code: "NOT_FOUND",
        });
      }
    }

    await prisma.label.update({
      where: {
        userId: ctx.session.userId,
        id: input.id,
      },
      data: {
        title,
        labelGroupId: input.labelGroupId,
      },
    });

    return "Ok";
  });
