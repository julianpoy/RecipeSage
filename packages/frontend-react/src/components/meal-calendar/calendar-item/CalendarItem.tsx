import type { MealPlanItemSummary } from "@recipesage/prisma";

export const CalendarItem = ({
  mealItem,
}: {
  mealItem: MealPlanItemSummary;
}) => (
  <span className="align-middle">
    {mealItem.recipe?.title || mealItem.title}
  </span>
);
