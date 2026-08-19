import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import {
  getAccessToMealPlan,
  MealPlanAccessLevel,
} from "@recipesage/util/server/db";
import { NotFoundError } from "../../errors";
import { AuthenticationEnforcement } from "../../authenticationEnforcement";
import { defineHandler } from "../../defineHandler";
import {
  formatDateUTC,
  formatDateUTCLocalized,
  getRequestLanguage,
  translate,
} from "@recipesage/util/server/general";
import {
  DAY_TITLE_I18N,
  DEFAULT_MEAL_I18N,
  getLanguageDirection,
  getMealSortOrder,
  getOrderedMeals,
  getMealColors,
  getMealDisplayNames,
} from "@recipesage/util/shared";

const schema = {
  query: z.object({
    version: z.string(),
    viewType: z.enum(["calendar", "list"]),
    calendarMonth: z.string().optional(),
    calendarYear: z.string().optional(),
    startOfWeek: z.enum(["sunday", "monday"]).optional(),
    preferredLanguage: z.string().optional(),
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  params: z.object({
    mealPlanId: z.string(),
  }),
};

function formatDatePretty(dateStr: string, locale: string): string {
  return formatDateUTCLocalized(dateStr, locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getMonthName(month: number, year: number, locale: string): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface PrintItem {
  title: string;
  meal: string;
  mealLabel: string;
  notes: string;
}

interface CalendarDay {
  date: number;
  dateStr: string;
  inactive: boolean;
  isToday: boolean;
  itemsByMeal: Record<string, PrintItem[]>;
  meals: string[];
}

export const printMealPlanHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
  },
  async (req, res) => {
    const mealPlan = await prisma.mealPlan.findUnique({
      where: {
        id: req.params.mealPlanId,
      },
      select: {
        id: true,
        title: true,
        customMealOptions: true,
      },
    });

    const access = await getAccessToMealPlan(
      res.locals.session.userId,
      req.params.mealPlanId,
    );

    if (!mealPlan || access.level === MealPlanAccessLevel.None) {
      throw new NotFoundError("Meal plan not found or you do not have access");
    }

    const mealPlanItems = await prisma.mealPlanItem.findMany({
      where: {
        mealPlanId: req.params.mealPlanId,
      },
      select: {
        id: true,
        title: true,
        notes: true,
        scheduledDate: true,
        meal: true,
        recipeId: true,
        recipe: {
          select: {
            title: true,
          },
        },
      },
    });

    const language = getRequestLanguage(req);

    const sortOrder = getMealSortOrder(mealPlan.customMealOptions);
    const mealColorMap = getMealColors(mealPlan.customMealOptions);
    const mealDisplayNameMap = getMealDisplayNames(mealPlan.customMealOptions);

    const mealLabels: Record<string, string> = {};
    for (const [meal, key] of Object.entries(DEFAULT_MEAL_I18N)) {
      mealLabels[meal] = await translate(language, key);
    }

    const itemsByDateStr = new Map<string, PrintItem[]>();
    for (const item of mealPlanItems) {
      const dateStr = formatDateUTC(item.scheduledDate);
      const mealKey = item.meal.toLowerCase();

      if (!mealLabels[mealKey]) {
        mealLabels[mealKey] = mealDisplayNameMap[mealKey] || item.meal;
      }

      const printItem: PrintItem = {
        title: item.recipe?.title || item.title,
        meal: mealKey,
        mealLabel: mealLabels[mealKey] || item.meal,
        notes: item.notes,
      };

      const existing = itemsByDateStr.get(dateStr);
      if (existing) {
        existing.push(printItem);
      } else {
        itemsByDateStr.set(dateStr, [printItem]);
      }
    }

    for (const items of itemsByDateStr.values()) {
      items.sort(
        (a, b) =>
          (sortOrder.get(a.meal) ?? 999) - (sortOrder.get(b.meal) ?? 999),
      );
    }

    const todayStr = req.query.today || formatDateUTC(new Date());

    if (req.query.viewType === "calendar") {
      const [todayYear, todayMonth] = todayStr.split("-").map(Number);
      const month = req.query.calendarMonth
        ? parseInt(req.query.calendarMonth, 10)
        : todayMonth;
      const year = req.query.calendarYear
        ? parseInt(req.query.calendarYear, 10)
        : todayYear;
      const startOfWeek = req.query.startOfWeek || "sunday";

      const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
      const endOfMonth = new Date(Date.UTC(year, month, 0));

      let startDay = startOfMonth.getUTCDay();
      if (startOfWeek === "monday") {
        startDay = startDay === 0 ? 6 : startDay - 1;
      }
      const startOfCalendar = new Date(startOfMonth);
      startOfCalendar.setUTCDate(startOfCalendar.getUTCDate() - startDay);

      const endDay = endOfMonth.getUTCDay();
      const daysToAdd =
        startOfWeek === "monday" ? (endDay === 0 ? 0 : 7 - endDay) : 6 - endDay;
      const endOfCalendar = new Date(endOfMonth);
      endOfCalendar.setUTCDate(endOfCalendar.getUTCDate() + daysToAdd);

      const dayTitleLabels = await Promise.all(
        DAY_TITLE_I18N.map((key) => translate(language, key)),
      );
      const dayTitles =
        startOfWeek === "monday"
          ? [...dayTitleLabels.slice(1), dayTitleLabels[0]]
          : dayTitleLabels;

      const orderedMeals = getOrderedMeals(mealPlan.customMealOptions);
      const weeks: CalendarDay[][] = [];
      let currentWeek: CalendarDay[] = [];
      const iter = new Date(startOfCalendar);

      while (iter <= endOfCalendar) {
        const dateStr = formatDateUTC(iter);
        const dayItems = itemsByDateStr.get(dateStr) || [];

        const itemsByMeal: Record<string, PrintItem[]> = {};
        const mealsPresent: string[] = [];
        for (const m of orderedMeals) {
          const key = m.toLowerCase();
          const mealItems = dayItems.filter((i) => i.meal === key);
          if (mealItems.length > 0) {
            itemsByMeal[key] = mealItems;
            mealsPresent.push(key);
          }
        }
        for (const item of dayItems) {
          if (!itemsByMeal[item.meal]) {
            itemsByMeal[item.meal] = dayItems.filter(
              (i) => i.meal === item.meal,
            );
            mealsPresent.push(item.meal);
          }
        }

        currentWeek.push({
          date: iter.getUTCDate(),
          dateStr,
          inactive: iter.getUTCMonth() !== month - 1,
          isToday: dateStr === todayStr,
          itemsByMeal,
          meals: mealsPresent,
        });

        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }

        iter.setUTCDate(iter.getUTCDate() + 1);
      }

      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }

      res.render("mealplan-default", {
        title: mealPlan.title,
        viewType: "calendar",
        monthTitle: getMonthName(month, year, language),
        dayTitles,
        weeks,
        mealLabels,
        mealColors: mealColorMap,
        printedOn: await translate(language, "generic.printedOn", {
          date: formatDateUTCLocalized(todayStr, language),
        }),
        language,
        direction: getLanguageDirection(language),
      });
    } else {
      const futureDates = Array.from(itemsByDateStr.keys())
        .filter((dateStr) => dateStr >= todayStr)
        .sort();

      const dates = futureDates.map((dateStr) => ({
        dateStr,
        formattedDate: formatDatePretty(dateStr, language),
        items: itemsByDateStr.get(dateStr) || [],
      }));

      res.render("mealplan-default", {
        title: mealPlan.title,
        viewType: "list",
        dates,
        mealColors: mealColorMap,
        printedOn: await translate(language, "generic.printedOn", {
          date: formatDateUTCLocalized(todayStr, language),
        }),
        language,
        direction: getLanguageDirection(language),
      });
    }
  },
);
