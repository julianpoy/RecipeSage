import { useTranslation } from "react-i18next";
import { CalendarIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { DEFAULT_MEAL_COLORS } from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { NullState } from "../../../components/NullState";

export type MealPlanPastEntry =
  | { type: "date"; dateStr: string }
  | { type: "emptyMonth"; key: string; label: string };

export interface MealPlanListData {
  upcomingDates: string[];
  pastDates: string[];
  listItemsByDate: Map<string, MealPlanItemSummary[]>;
  listFormattedDates: Map<string, string>;
  pastEntries: MealPlanPastEntry[];
}

export const MealPlanListView = ({
  listData,
  mealColors,
  selectedDays,
  pastMealsExpanded,
  loadingHistory,
  onToggleDaySelection,
  onPastMealsExpandedChange,
  onItemClicked,
  onShowMorePastMonths,
}: {
  listData: MealPlanListData;
  mealColors: Record<string, string | undefined>;
  selectedDays: string[];
  pastMealsExpanded: boolean;
  loadingHistory: boolean;
  onToggleDaySelection: (dateStr: string) => void;
  onPastMealsExpandedChange: (expanded: boolean) => void;
  onItemClicked: (item: MealPlanItemSummary) => void;
  onShowMorePastMonths: () => void;
}) => {
  const { t } = useTranslation();
  const selectedDaysSet = new Set(selectedDays);

  const getMealBorderColor = (meal: string): string =>
    mealColors[meal.toLowerCase()] ||
    DEFAULT_MEAL_COLORS[meal.toLowerCase()] ||
    DEFAULT_MEAL_COLORS.other;

  const renderDateGroup = (dateStr: string) => (
    <div key={dateStr} role="group">
      <button
        type="button"
        aria-pressed={selectedDaysSet.has(dateStr)}
        className={cn(
          "flex min-h-11 w-full cursor-pointer items-center border-b px-4 py-2 text-start text-sm font-bold text-muted-foreground select-none hover:bg-foreground/5",
          selectedDaysSet.has(dateStr) && "bg-primary/15 hover:bg-primary/15",
        )}
        onClick={() => onToggleDaySelection(dateStr)}
      >
        {listData.listFormattedDates.get(dateStr)}
      </button>
      {(listData.listItemsByDate.get(dateStr) || []).map((item) => (
        <button
          key={item.id}
          type="button"
          className="flex min-h-12 w-full items-center border-s-4 px-4 py-2 text-start hover:bg-muted"
          style={{ borderInlineStartColor: getMealBorderColor(item.meal) }}
          onClick={() => onItemClicked(item)}
        >
          <span className="min-w-0 flex-1 break-words">
            <span dir="auto">{item.recipe?.title || item.title}</span>
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      {listData.upcomingDates.length === 0 &&
        listData.pastDates.length === 0 && (
          <NullState icon={<CalendarIcon className="text-muted-foreground" />}>
            <p className="text-muted-foreground">
              {t("pages.mealPlan.list.empty")}
            </p>
          </NullState>
        )}
      <div>
        {listData.upcomingDates.length === 0 &&
          listData.pastDates.length > 0 && (
            <NullState
              icon={<CalendarIcon className="text-muted-foreground" />}
            >
              <p className="text-muted-foreground">
                {t("pages.mealPlan.list.noUpcoming")}
              </p>
            </NullState>
          )}
        {listData.upcomingDates.map((dateStr) => renderDateGroup(dateStr))}
        <div role="group">
          <button
            type="button"
            aria-expanded={pastMealsExpanded}
            className="mt-4 flex min-h-11 w-full cursor-pointer items-center gap-2 border-b px-4 py-2 text-start text-sm font-bold text-muted-foreground select-none hover:bg-foreground/5"
            onClick={() => onPastMealsExpandedChange(!pastMealsExpanded)}
          >
            <span className="min-w-0 flex-1">
              {t("pages.mealPlan.list.pastMeals")}
            </span>
            {pastMealsExpanded ? (
              <ChevronUpIcon className="size-5 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronDownIcon className="size-5 shrink-0" aria-hidden="true" />
            )}
          </button>
        </div>
        {pastMealsExpanded && (
          <>
            {listData.pastEntries.map((entry) =>
              entry.type === "date" ? (
                renderDateGroup(entry.dateStr)
              ) : (
                <div
                  key={entry.key}
                  className="flex min-h-12 items-center px-4 py-2 text-muted-foreground italic"
                >
                  {t("pages.mealPlan.list.noMealsForMonth", {
                    monthYear: entry.label,
                  })}
                </div>
              ),
            )}
            <div className="mt-2 mb-4 flex justify-center">
              <Button
                variant="ghost"
                size="lg"
                className="text-primary"
                disabled={loadingHistory}
                onClick={onShowMorePastMonths}
              >
                {loadingHistory && <Spinner data-icon="inline-start" />}
                {t("pages.mealPlan.list.showMore")}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
};
