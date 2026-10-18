import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_MEAL_COLORS, DEFAULT_MEALS } from "@recipesage/util/shared";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { cn } from "@/lib/utils";
import { CalendarItem } from "../calendar-item/CalendarItem";
import { defaultMealI18nKeys } from "../defaultMealI18nKeys";

export const MealGroup = ({
  mealItems,
  enableEditing = false,
  mealColors = {},
  mealDisplayNames = {},
  onItemClicked,
  onItemDragEnd,
}: {
  mealItems: {
    meals: string[];
    itemsByMeal: Record<string, MealPlanItemSummary[] | undefined>;
  };
  enableEditing?: boolean;
  mealColors?: Record<string, string | undefined>;
  mealDisplayNames?: Record<string, string | undefined>;
  onItemClicked?: (mealItem: MealPlanItemSummary) => void;
  onItemDragEnd?: () => void;
}) => {
  const { t } = useTranslation();
  const [mealItemsDragging, setMealItemsDragging] = useState<
    Record<string, boolean>
  >({});

  const getMealTitle = (mealName: string) => {
    const i18nKey = defaultMealI18nKeys[mealName];
    if (DEFAULT_MEALS.includes(mealName) && i18nKey) return t(i18nKey);
    return mealDisplayNames[mealName] || mealName;
  };

  const getMealBorderColor = (mealName: string) =>
    mealColors[mealName] ||
    DEFAULT_MEAL_COLORS[mealName] ||
    DEFAULT_MEAL_COLORS.other;

  return mealItems.meals.map((mealName) => {
    const items = mealItems.itemsByMeal[mealName] || [];

    return (
      <div key={mealName} className="mb-2.5">
        {items.length > 0 && (
          <span className="font-bold" dir="auto">
            {getMealTitle(mealName)}
          </span>
        )}
        {items.map((mealItem) => (
          <div
            key={mealItem.id}
            role="button"
            tabIndex={0}
            dir="auto"
            draggable={enableEditing}
            className={cn(
              "my-1.5 block cursor-pointer rounded-sm border-s-4 border-foreground bg-secondary p-2 text-start shadow-[1px_1px_5px_rgba(0,0,0,0.3)] outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/30",
              mealItemsDragging[mealItem.id] && "opacity-50",
            )}
            style={{
              borderInlineStartColor: getMealBorderColor(
                mealItem.meal.toLowerCase(),
              ),
            }}
            onClick={() => onItemClicked?.(mealItem)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              onItemClicked?.(mealItem);
            }}
            onKeyUp={(event) => {
              if (event.key === "Enter") event.stopPropagation();
            }}
            onDragStart={(event) => {
              setMealItemsDragging((prev) => ({
                ...prev,
                [mealItem.id]: true,
              }));
              event.dataTransfer.setData("text", mealItem.id);
            }}
            onDragEnd={() => {
              setMealItemsDragging((prev) => ({
                ...prev,
                [mealItem.id]: false,
              }));
              onItemDragEnd?.();
            }}
          >
            <CalendarItem mealItem={mealItem} />
          </div>
        ))}
      </div>
    );
  });
};
