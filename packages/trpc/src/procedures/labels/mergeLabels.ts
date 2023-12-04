import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateSession } from "../../utils/validateSession";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { labelSummary } from "../../types/labelSummary";

    // if (!req.query.sourceLabelId || !req.query.targetLabelId) {
    //   throw BadRequest("Must pass sourceLabelId and targetLabelId");
    // }
    //
    // if (req.query.sourceLabelId === req.query.targetLabelId) {
    //   throw BadRequest("Source label id cannot match destination label id");
    // }
    //
    // await sequelize.transaction(async (transaction) => {
    //   const sourceLabel = await Label.findOne({
    //     where: {
    //       id: req.query.sourceLabelId,
    //       userId: res.locals.session.userId,
    //     },
    //     include: [
    //       {
    //         model: Recipe_Label,
    //         as: "recipe_labels",
    //         attributes: ["recipeId"],
    //       },
    //     ],
    //     transaction,
    //   });
    //
    //   if (!sourceLabel) {
    //     throw NotFound("Source label not found");
    //   }
    //
    //   const targetLabel = await Label.findOne({
    //     where: {
    //       id: req.query.targetLabelId,
    //       userId: res.locals.session.userId,
    //     },
    //     include: [
    //       {
    //         model: Recipe_Label,
    //         as: "recipe_labels",
    //         attributes: ["recipeId"],
    //       },
    //     ],
    //     transaction,
    //   });
    //
    //   if (!targetLabel) {
    //     throw NotFound("Target label not found");
    //   }
    //
    //   const sourceLabelRecipeIds = sourceLabel.recipe_labels.map(
    //     (recipeLabel) => recipeLabel.recipeId,
    //   );
    //   const targetLabelRecipeIds = targetLabel.recipe_labels.map(
    //     (recipeLabel) => recipeLabel.recipeId,
    //   );
    //
    //   const recipeIdsToUpdate = sourceLabelRecipeIds.filter(
    //     (recipeId) => !targetLabelRecipeIds.includes(recipeId),
    //   );
    //
    //   await Recipe_Label.update(
    //     {
    //       labelId: req.query.targetLabelId,
    //     },
    //     {
    //       where: {
    //         labelId: req.query.sourceLabelId,
    //         recipeId: recipeIdsToUpdate,
    //       },
    //       transaction,
    //     },
    //   );
    //
    //   await Label.destroy({
    //     where: {
    //       id: req.query.sourceLabelId,
    //     },
    //     transaction,
    //   });
    // });
    //
    // res.status(200).send("ok");
export const mergeLabels = publicProcedure
  .input(
    z.object({
      sourceId: z.string().min(1).max(100),
      targetId: z.string().min(1).max(100),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateSession(session);

    const sourceLabel = await prisma.label.findUniqueOrThrow({
      where: {
        id: input.sourceId,
      },
      select: {
        id: true,
        recipeLabels: {
          select: {
            recipeId: true,
          }
        }
      }
    });

    const targetLabel = await prisma.label.findUniqueOrThrow({
      where: {
        id: input.targetId,
      },
      select: {
        id: true,
        recipeLabels: {
          select: {
            recipeId: true,
          }
        }
      }
    });
  });
