import {
  LabelSummary,
  labelSummary,
  labelSummarySchema,
  prisma,
} from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { cleanLabelTitle } from "@recipesage/util/shared";

export const upsertLabel = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/labels/upsertLabel",
      tags: ["labels"],
      summary: "Create or update a label",
      protect: true,
    },
  })
  .output(labelSummarySchema)
  .input(
    z.object({
      title: z.string().min(1).max(100),
      labelGroupId: z
        .string()
        .min(1)
        .max(100)
        .nullable()
        .optional()
        .describe(
          "The label group to assign this label to. Null for no group, undefined to leave unchanged if-exists",
        ),
      addToRecipeIds: z.array(z.string()).min(1).nullable(),
    }),
  )
  .mutation(async ({ ctx, input }): Promise<LabelSummary> => {
    const title = cleanLabelTitle(input.title);
    if (!title.length) {
      throw new TRPCError({
        message: "Label title invalid",
        code: "BAD_REQUEST",
      });
    }

    const existingLabel = await prisma.label.findFirst({
      where: {
        userId: ctx.session.userId,
        title,
      },
    });

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

    return await prisma.$transaction(async (tx) => {
      let id = "";
      if (existingLabel) {
        await tx.label.update({
          where: {
            id: existingLabel.id,
          },
          data: {
            title,
            labelGroupId: input.labelGroupId,
          },
        });
        id = existingLabel.id;
      } else {
        const _label = await tx.label.create({
          data: {
            title,
            userId: ctx.session.userId,
            labelGroupId: input.labelGroupId,
          },
        });
        id = _label.id;
      }

      if (input.addToRecipeIds?.length) {
        const recipeIds = new Set(input.addToRecipeIds);
        await tx.recipeLabel.createMany({
          data: Array.from(recipeIds).map((recipeId) => ({
            recipeId,
            labelId: id,
          })),
          skipDuplicates: true,
        });
      }

      const label = await tx.label.findUniqueOrThrow({
        where: {
          id,
        },
        ...labelSummary,
      });

      return label;
    });
  });
