import { Prisma } from "@prisma/client";
import { userPublic } from "./userPublic";

/**
 * Provides fields necessary for displaying a summary about a meal plan,
 * not including items
 **/
export const mealOptionSummary =
  Prisma.validator<Prisma.MealOptionItemFindFirstArgs>()({
    select: {
      id: true,
      userId: true,
      user: userPublic,
      title: true,
      scheduled: true,
      createdAt: true,
    },
  });

/**
 * Provides fields necessary for displaying a summary about a meal plan,
 * not including items
 **/
export type MealOptionSummary = Prisma.MealOptionItemGetPayload<
  typeof mealOptionSummary
>;
