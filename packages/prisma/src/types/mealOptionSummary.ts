import { Prisma } from "@prisma/client";

/**
 * Provides fields necessary for displaying a summary about a meal option
 **/
export const mealOptionSummary =
  Prisma.validator<Prisma.MealOptionFindFirstArgs>()({
    select: {
      id: true,
      userId: true,
      title: true,
      mealTime: true,
      createdAt: true,
      updatedAt: true,
    },
  });

/**
 * Provides fields necessary for displaying a summary about a meal plan,
 * not including items
 **/
export type MealOptionSummary = Prisma.MealOptionGetPayload<
  typeof mealOptionSummary
>;
