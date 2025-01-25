import { Prisma } from "@prisma/client";
import { userPublic } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a meal plan,
 * not including items
 **/
export const mealPlanSummary = Prisma.validator<Prisma.MealPlanFindFirstArgs>()(
  {
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
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          items: true,
        },
      },
    },
  },
);

/**
 * Provides fields necessary for displaying a summary about a meal plan,
 * not including items
 **/
export type MealPlanSummary = Prisma.MealPlanGetPayload<typeof mealPlanSummary>;
