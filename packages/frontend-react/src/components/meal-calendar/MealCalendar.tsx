import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import dayjs, { type Dayjs } from "dayjs";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DAY_TITLE_I18N,
  MealPlanPreferenceKey,
  getMealColors,
  getMealDisplayNames,
  getMealSortOrder,
  getOrderedMeals,
} from "@recipesage/util/shared";
import type { MealPlanItemSummary } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MealGroup } from "./meal-group/MealGroup";
import { useEvent } from "../../hooks/useEvent";
import { EventName } from "../../services/events";
import { preferencesStore } from "../../stores/preferencesStore";
import { formatMonthName } from "../../utils/formatDate";

export interface MealDayData {
  itemsByMeal: Record<string, MealPlanItemSummary[] | undefined>;
  items: MealPlanItemSummary[];
  meals: string[];
}

export type MealsByDate = Record<
  number,
  | Record<number, Record<number, MealDayData | undefined> | undefined>
  | undefined
>;

export type MealCalendarMode = "full" | "split" | "outline";

export interface MealCalendarItemMovedEvent {
  mealItem: MealPlanItemSummary;
  dateStamp: string;
}

const DATE_FORMAT = "YYYY-MM-DD";

const getToday = () => dayjs().format(DATE_FORMAT);

const getYMD = (stamp: string | Date | Dayjs): number[] => {
  let dateString;
  if (typeof stamp === "string") {
    dateString = stamp;
  } else {
    const scheduledDayjs = dayjs(stamp);
    dateString = `${scheduledDayjs.year()}-${scheduledDayjs.month() + 1}-${scheduledDayjs.date()}`;
  }

  return dateString.split("-").map((el) => parseInt(el, 10));
};

const getDaysBetween = (
  dateStamp1: string | Dayjs,
  dateStamp2: string | Dayjs,
): string[] => {
  const dateStamps: string[] = [];

  const first = dayjs(dateStamp1);
  const second = dayjs(dateStamp2);
  const start = first.isAfter(second) ? second : first;
  const end = first.isAfter(second) ? first : second;

  let iterDate = start;

  while (!iterDate.isAfter(end)) {
    dateStamps.push(iterDate.format(DATE_FORMAT));

    iterDate = iterDate.add(1, "day");
  }

  return dateStamps;
};

const generateCalendar = (center: Date, startOfWeek: string) => {
  const weeksOfMonth: Dayjs[][] = [];

  const base = dayjs(center);
  const startOfMonth = base.startOf("month");
  let startOfCalendar = startOfMonth.startOf("week");
  const endOfMonth = base.endOf("month");
  let endOfCalendar = endOfMonth.endOf("week");

  let dayTitleKeys = [...DAY_TITLE_I18N];
  if (startOfWeek === "monday") {
    dayTitleKeys = [...DAY_TITLE_I18N.slice(1), DAY_TITLE_I18N[0]];
    startOfCalendar = startOfCalendar.add(1, "day");

    // Special case for months starting on sunday: Add an additional week before
    if (startOfMonth.day() === 0) {
      startOfCalendar = startOfMonth.subtract(1, "week").add(1, "day");
    }

    endOfCalendar =
      endOfMonth.day() === 0 ? endOfMonth : endOfCalendar.add(1, "day");
  }

  let iteratorDate = dayjs(startOfCalendar);

  while (iteratorDate.isBefore(endOfCalendar)) {
    const week = [];

    while (week.length < 7) {
      week.push(iteratorDate);
      iteratorDate = iteratorDate.add(1, "day");
    }

    weeksOfMonth.push(week);
  }

  const bounds: [Dayjs, Dayjs] = [startOfCalendar, endOfCalendar];

  return {
    weeksOfMonth,
    dayTitleKeys,
    bounds,
  };
};

const processMealPlanItems = (
  mealPlanItems: MealPlanItemSummary[],
  customMealOptions: string | null,
): MealsByDate => {
  const mealsByDate: MealsByDate = {};

  const sortOrder = getMealSortOrder(customMealOptions);
  const orderedMeals = getOrderedMeals(customMealOptions);

  [...mealPlanItems]
    .sort((a, b) => {
      const comp =
        (sortOrder.get(a.meal.toLowerCase()) ?? 999) -
        (sortOrder.get(b.meal.toLowerCase()) ?? 999);
      if (comp === 0) return a.title.localeCompare(b.title);
      return comp;
    })
    .forEach((item) => {
      const [year, month, day] = getYMD(item.scheduled || item.scheduledDate);
      const yearData = (mealsByDate[year] ||= {});
      const monthData = (yearData[month] ||= {});
      const dayData = (monthData[day] ||= {
        itemsByMeal: Object.fromEntries(
          orderedMeals.map((m) => [m.toLowerCase(), []]),
        ),
        items: [],
        meals: orderedMeals.map((m) => m.toLowerCase()),
      });
      const mealKey = item.meal.toLowerCase();
      let mealItems = dayData.itemsByMeal[mealKey];
      if (!mealItems) {
        mealItems = [];
        dayData.itemsByMeal[mealKey] = mealItems;
        dayData.meals.push(mealKey);
      }
      mealItems.push(item);
      dayData.items.push(item);
    });

  return mealsByDate;
};

const EMPTY_DAY: MealDayData = {
  itemsByMeal: {},
  meals: [],
  items: [],
};

export const MealCalendar = ({
  mealPlanItems,
  enableEditing = false,
  mode = "outline",
  customMealOptions = null,
  onMealsByDateChange,
  onSelectedDaysChange,
  onVisibleRangeChange,
  onItemMoved,
  onItemClicked,
  onDayClicked,
}: {
  mealPlanItems: MealPlanItemSummary[];
  enableEditing?: boolean;
  mode?: MealCalendarMode;
  customMealOptions?: string | null;
  onMealsByDateChange?: (mealsByDate: MealsByDate) => void;
  onSelectedDaysChange?: (selectedDays: string[]) => void;
  onVisibleRangeChange?: (range: [Dayjs, Dayjs]) => void;
  onItemMoved?: (event: MealCalendarItemMovedEvent) => void;
  onItemClicked?: (mealItem: MealPlanItemSummary) => void;
  onDayClicked?: (date: Date) => void;
}) => {
  const { t } = useTranslation();
  const startOfWeek = preferencesStore(
    (state) => state.preferences[MealPlanPreferenceKey.StartOfWeek],
  );

  const [today, setToday] = useState(() => new Date());
  const [center, setCenter] = useState(() => new Date());
  const [selectedDays, setSelectedDays] = useState<string[]>(() => [
    getToday(),
  ]);
  const [highlightedDay, setHighlightedDay] = useState<string>();
  const dragAnchorRef = useRef<string | undefined>(getToday());
  const selectionIsDefaultRef = useRef(true);
  const dayDragInProgressRef = useRef(false);

  const { weeksOfMonth, dayTitleKeys } = useMemo(
    () => generateCalendar(center, startOfWeek),
    [center, startOfWeek],
  );

  const mealsByDate = useMemo(
    () => processMealPlanItems(mealPlanItems, customMealOptions),
    [mealPlanItems, customMealOptions],
  );
  const mealColors = useMemo(
    () => getMealColors(customMealOptions),
    [customMealOptions],
  );
  const mealDisplayNames = useMemo(
    () => getMealDisplayNames(customMealOptions),
    [customMealOptions],
  );

  const emitMealsByDate = useEffectEvent((value: MealsByDate) => {
    onMealsByDateChange?.(value);
  });
  useEffect(() => {
    emitMealsByDate(mealsByDate);
  }, [mealsByDate]);

  const emitSelectedDays = useEffectEvent((value: string[]) => {
    onSelectedDaysChange?.(value);
  });
  useEffect(() => {
    emitSelectedDays(selectedDays);
  }, [selectedDays]);

  useEffect(() => {
    const onDocumentMouseUp = () => {
      dayDragInProgressRef.current = false;
    };
    document.addEventListener("mouseup", onDocumentMouseUp);
    return () => document.removeEventListener("mouseup", onDocumentMouseUp);
  }, []);

  useEvent(EventName.ApplicationMultitaskingResumed, () => {
    const newToday = getToday();
    const staleToday = dayjs(today).format(DATE_FORMAT);
    if (staleToday === newToday) return;

    const wasCenteredOnStaleToday = dayjs(center).isSame(
      dayjs(staleToday),
      "month",
    );

    const now = new Date();
    setToday(now);
    dragAnchorRef.current = undefined;

    if (
      selectionIsDefaultRef.current &&
      selectedDays.length === 1 &&
      selectedDays[0] === staleToday
    ) {
      setSelectedDays([newToday]);
      if (wasCenteredOnStaleToday) setCenter(new Date(now));
    }
  });

  const moveCalendar = (direction: -1 | 1) => {
    selectionIsDefaultRef.current = false;
    dragAnchorRef.current = undefined;

    const currentMonth = center.getMonth();
    const newMonth = direction > 0 ? currentMonth + 1 : currentMonth - 1;
    const newCenter = new Date(center.getFullYear(), newMonth, 1);
    setCenter(newCenter);

    const { bounds } = generateCalendar(newCenter, startOfWeek);
    onVisibleRangeChange?.(bounds);

    if (
      dayjs(selectedDays[0]).isBefore(bounds[0]) ||
      dayjs(selectedDays[0]).isAfter(bounds[1])
    ) {
      setSelectedDays([dayjs(newCenter).format(DATE_FORMAT)]);
    }
  };

  const includeYear = center.getFullYear() !== today.getFullYear();
  const calendarTitle =
    formatMonthName(center) + (includeYear ? ` ${center.getFullYear()}` : "");

  const mealItemsByDay = (dateStamp: string | Date | Dayjs): MealDayData => {
    const [year, month, day] = getYMD(dateStamp);
    return mealsByDate[year]?.[month]?.[day] || EMPTY_DAY;
  };

  const isToday = (day: Dayjs) =>
    today.getFullYear() === day.year() &&
    today.getMonth() === day.month() &&
    today.getDate() === day.date();

  const isHighlighted = (day: Dayjs) => {
    const dayStamp = day.format(DATE_FORMAT);
    return dayStamp === highlightedDay || selectedDays.includes(dayStamp);
  };

  const dayMouseDown = (shiftKey: boolean, day: Dayjs) => {
    dayDragInProgressRef.current = true;
    selectionIsDefaultRef.current = false;
    const dragAnchor = dragAnchorRef.current;
    if (shiftKey && dragAnchor) {
      setSelectedDays(getDaysBetween(dragAnchor, day));
    } else {
      const newAnchor = day.format(DATE_FORMAT);
      dragAnchorRef.current = newAnchor;
      setSelectedDays([newAnchor]);
    }
    onDayClicked?.(day.toDate());
  };

  const dayMouseOver = (day: Dayjs) => {
    const dragAnchor = dragAnchorRef.current;
    if (dayDragInProgressRef.current && dragAnchor) {
      setSelectedDays(getDaysBetween(dragAnchor, day));
    }
  };

  const dayKeyUp = (event: KeyboardEvent, day: Dayjs) => {
    if (event.key !== "Enter") return;
    dayMouseDown(event.shiftKey, day);
    dayDragInProgressRef.current = false;
  };

  const dayDragDrop = (event: DragEvent, day: Dayjs) => {
    event.preventDefault();
    dayDragInProgressRef.current = false;
    setHighlightedDay(undefined);
    const mealItemId = event.dataTransfer.getData("text");
    const mealItem = mealPlanItems.find((item) => item.id === mealItemId);
    if (!mealItem) return;

    const newDate = day.format(DATE_FORMAT);
    // Do not trigger event if the item has not moved to a different day
    if (mealItem.scheduledDate === newDate) return;

    onItemMoved?.({
      mealItem,
      dateStamp: newDate,
    });
  };

  const dayDragOver = (event: DragEvent, day: Dayjs) => {
    event.preventDefault();
    setHighlightedDay(day.format(DATE_FORMAT));
  };

  const firstSelectedDay = mealItemsByDay(selectedDays[0]);

  return (
    <div className="flex flex-wrap *:w-1/2 *:grow max-[900px]:*:w-full">
      <div>
        <div className="flex items-center justify-center text-center text-lg leading-[44px] font-bold">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={t("generic.previous")}
            onClick={() => moveCalendar(-1)}
          >
            <ChevronLeftIcon className="size-6 rtl:rotate-180" />
          </Button>
          <span className="max-w-64 flex-1">{calendarTitle}</span>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={t("generic.next")}
            onClick={() => moveCalendar(1)}
          >
            <ChevronRightIcon className="size-6 rtl:rotate-180" />
          </Button>
        </div>

        <div className="p-1.5">
          <div className="grid grid-cols-7">
            {dayTitleKeys.map((dayTitleKey) => (
              <div key={dayTitleKey} className="p-1.5 text-center">
                {t(dayTitleKey)}
              </div>
            ))}
          </div>
          {weeksOfMonth.map((weekOfMonth) => (
            <div
              key={weekOfMonth[0].format(DATE_FORMAT)}
              className="grid grid-cols-7 select-none"
            >
              {weekOfMonth.map((day) => {
                const dayIsToday = isToday(day);
                const dayIsHighlighted = isHighlighted(day);
                const dayIsInactive = center.getMonth() !== day.month();
                const dayData = mealItemsByDay(day);

                return (
                  <div
                    key={day.format(DATE_FORMAT)}
                    tabIndex={0}
                    className={cn(
                      "min-w-0 cursor-pointer p-1.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                      mode === "full" &&
                        "min-h-20 overflow-hidden border border-border transition-colors duration-100 hover:bg-black/[0.017]",
                      mode === "full" &&
                        dayIsHighlighted &&
                        "bg-primary/30 hover:bg-primary/30",
                      mode !== "full" && "text-center",
                    )}
                    onKeyUp={(event) => dayKeyUp(event, day)}
                    onMouseDown={(event) => dayMouseDown(event.shiftKey, day)}
                    onMouseUp={() => {
                      dayDragInProgressRef.current = false;
                    }}
                    onMouseOver={() => dayMouseOver(day)}
                    onDragOver={(event) => dayDragOver(event, day)}
                    onDrop={(event) => dayDragDrop(event, day)}
                  >
                    <div
                      className={cn(
                        "inline-block size-7 rounded-full ps-px text-center leading-7 text-nowrap",
                        mode === "full" ? "mb-1.5" : "mb-0.5",
                        dayIsInactive && "text-muted-foreground",
                        mode === "full" &&
                          dayIsToday &&
                          "bg-primary text-primary-foreground",
                        mode !== "full" &&
                          dayIsToday &&
                          "font-bold text-primary",
                        mode !== "full" &&
                          dayIsHighlighted &&
                          "bg-primary/70 text-primary-foreground",
                      )}
                    >
                      {day.date()}
                    </div>
                    {mode === "full" && (
                      <div>
                        <MealGroup
                          mealItems={dayData}
                          enableEditing={enableEditing}
                          mealColors={mealColors}
                          mealDisplayNames={mealDisplayNames}
                          onItemClicked={onItemClicked}
                          onItemDragEnd={() => setHighlightedDay(undefined)}
                        />
                      </div>
                    )}
                    {(mode === "split" || mode === "outline") && (
                      <div className="leading-[0]">
                        {dayData.items.map((mealItem) => (
                          <div
                            key={mealItem.id}
                            className="mx-0.5 mb-0.5 inline-block size-[5px] rounded-full bg-primary"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {mode === "outline" && (
          <p className="my-4">
            {firstSelectedDay.items.length > 0 && (
              <span>
                <i>{t("components.mealCalendar.recipes")}:</i>&nbsp;
                <span dir="auto">
                  {firstSelectedDay.items.map((item) => item.title).join(", ")}
                </span>
              </span>
            )}
            {firstSelectedDay.items.length === 0 && (
              <span>
                <i>{t("components.mealCalendar.noRecipes")}</i>
              </span>
            )}
          </p>
        )}
      </div>
      {mode === "split" && (
        <div className="p-4 pb-16">
          <div className="px-4 py-3 text-center">
            {t("components.mealCalendar.meals")}:
          </div>
          {selectedDays.length !== 1 && (
            <p className="px-4 py-3 text-center text-sm text-muted-foreground">
              {t("components.mealCalendar.selectDay")}
            </p>
          )}
          {selectedDays.length === 1 && firstSelectedDay.items.length === 0 && (
            <p className="px-4 py-3 text-center text-sm text-muted-foreground">
              {t("components.mealCalendar.noMeals")}
            </p>
          )}
          {selectedDays.length === 1 && (
            <MealGroup
              mealItems={firstSelectedDay}
              enableEditing={enableEditing}
              mealColors={mealColors}
              mealDisplayNames={mealDisplayNames}
              onItemClicked={onItemClicked}
            />
          )}
        </div>
      )}
    </div>
  );
};
