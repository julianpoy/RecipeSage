import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";
import { userPublic, userPublicSchema } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a meal plan,
 * not including items
 **/
export const mealPlanSummary = {
  select: {
    id: true,
    userId: true,
    user: userPublic,
    collaboratorUsers: {
      select: {
        user: userPublic,
      },
    },
    title: true,
    customMealOptions: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        items: true,
      },
    },
  },
} satisfies Prisma.MealPlanFindFirstArgs;

/**
 * Provides fields necessary for displaying a summary about a meal plan,
 * not including items
 **/
export type MealPlanSummary = Prisma.MealPlanGetPayload<typeof mealPlanSummary>;

export const mealPlanSummarySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  user: userPublicSchema,
  collaboratorUsers: z.array(
    z.object({
      user: userPublicSchema,
    }),
  ),
  title: z.string(),
  customMealOptions: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  _count: z.object({
    items: z.number().int(),
  }),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof mealPlanSummarySchema
> satisfies MealPlanSummary;
const _checkTypeSatisfiesSchema = {} as MealPlanSummary satisfies z.infer<
  typeof mealPlanSummarySchema
>;
