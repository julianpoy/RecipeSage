import { authenticatedProcedure } from "../../trpc";
import {
  WSBroadcastEventType,
  broadcastWSEventIgnoringErrors,
} from "@recipesage/util/server/general";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  MealPlanAccessLevel,
  getAccessToMealPlan,
} from "@recipesage/util/server/db";
import {
  MEAL_PLAN_ITEMS_MEAL_LENGTH_LIMIT,
  MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT,
  MEAL_PLAN_ITEMS_TITLE_LENGTH_LIMIT,
  UPSERT_MEAL_PLAN_ITEMS_PAGINATION_LIMIT,
} from "@recipesage/util/shared";

export const upsertMealPlanItems = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/mealPlans/upsertMealPlanItems",
      tags: ["mealPlans"],
      summary: "Create or update multiple meal plan items via id-keyed upsert",
      protect: true,
    },
  })
  .input(
    z.object({
      mealPlanId: z.uuid(),
      items: z
        .array(
          z.object({
            id: z.uuid(),
            title: z.string().min(1).max(MEAL_PLAN_ITEMS_TITLE_LENGTH_LIMIT),
            scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            meal: z.string().min(1).max(MEAL_PLAN_ITEMS_MEAL_LENGTH_LIMIT),
            recipeId: z.uuid().nullable(),
            notes: z
              .string()
              .max(MEAL_PLAN_ITEMS_NOTES_LENGTH_LIMIT)
              .optional(),
            createdAt: z.coerce.date().optional(),
            updatedAt: z.coerce.date(),
          }),
        )
        .min(1)
        .max(UPSERT_MEAL_PLAN_ITEMS_PAGINATION_LIMIT),
    }),
  )
  .output(
    z.object({
      reference: z.uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const access = await getAccessToMealPlan(
      ctx.session.userId,
      input.mealPlanId,
    );

    if (access.level === MealPlanAccessLevel.None) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message:
          "Meal plan with that id does not exist or you do not have access",
      });
    }

    const existingItems = await prisma.mealPlanItem.findMany({
      where: {
        id: {
          in: input.items.map((el) => el.id),
        },
      },
      select: {
        id: true,
        mealPlanId: true,
        updatedAt: true,
      },
    });

    const existingItemsById = new Map(existingItems.map((el) => [el.id, el]));
    for (const item of input.items) {
      const existingItem = existingItemsById.get(item.id);

      if (existingItem && existingItem.mealPlanId !== input.mealPlanId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "One of the items you've passed does not not belong to the meal plan id you're updating",
        });
      }
    }

    const itemsToWrite = input.items.filter((item) => {
      const existingItem = existingItemsById.get(item.id);
      return !existingItem || existingItem.updatedAt <= item.updatedAt;
    });

    await prisma.$transaction(async (tx) => {
      for (const item of itemsToWrite) {
        const updatedAt = new Date(
          Math.min(Date.now(), item.updatedAt.getTime()),
        );
        const createdAt = new Date(
          Math.min(Date.now(), item.createdAt?.getTime() || Date.now()),
        );

        await tx.mealPlanItem.upsert({
          where: {
            id: item.id,
          },
          create: {
            id: item.id,
            mealPlanId: input.mealPlanId,
            title: item.title,
            userId: ctx.session.userId,
            scheduled: null,
            scheduledDate: new Date(item.scheduledDate),
            meal: item.meal,
            recipeId: item.recipeId,
            notes: item.notes ?? "",
            createdAt,
            updatedAt,
          },
          update: {
            title: item.title,
            scheduled: null,
            scheduledDate: new Date(item.scheduledDate),
            meal: item.meal,
            recipeId: item.recipeId,
            notes: item.notes,
            updatedAt,
          },
        });
      }
    });

    const reference = crypto.randomUUID();
    for (const subscriberId of access.subscriberIds) {
      broadcastWSEventIgnoringErrors(
        subscriberId,
        WSBroadcastEventType.MealPlanUpdated,
        {
          reference,
          mealPlanId: input.mealPlanId,
        },
      );
    }

    return {
      reference,
    };
  });
