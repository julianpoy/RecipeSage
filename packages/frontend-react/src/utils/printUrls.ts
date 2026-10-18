import { serverConfig } from "./serverConfig";
import { session } from "./session";

export interface RecipeTemplateModifiers {
  version?: string;
  halfsheet?: boolean;
  verticalInstrIng?: boolean;
  titleImage?: boolean;
  hideNotes?: boolean;
  hideSource?: boolean;
  hideSourceURL?: boolean;
  hideRating?: boolean;
  hideNutrition?: boolean;
  hideLinkedRecipes?: boolean;
  showLastMade?: boolean;
  printPreview?: boolean;
  showPrintButton?: boolean;
  print?: boolean; // Triggers immediate print
  scale?: string;
  unitSystem?: string;
  preferredLanguage?: string;
  today?: string;
}

export const printUrls = {
  shoppingList(
    shoppingListId: string,
    options: {
      groupSimilar: boolean;
      groupCategories: boolean;
      sortBy?: string;
      preferredLanguage?: string;
      today?: string;
    },
  ) {
    let query = `${session.getTokenQuery()}&version=${window.version}&print=true`;

    if (options.groupSimilar) query += "&groupSimilar=true";
    if (options.groupCategories) query += "&groupCategories=true";
    if (options.preferredLanguage)
      query += `&preferredLanguage=${options.preferredLanguage}`;
    if (options.sortBy) query += `&sortBy=${options.sortBy}`;
    if (options.today) query += `&today=${options.today}`;

    return `${serverConfig.apiBase}print/shoppingList/${shoppingListId}${query}`;
  },

  mealPlan(
    mealPlanId: string,
    options: {
      viewType: string;
      calendarMonth?: number;
      calendarYear?: number;
      startOfWeek?: string;
      preferredLanguage?: string;
      today?: string;
    },
  ) {
    let query = `${session.getTokenQuery()}&version=${window.version}&print=true`;

    query += `&viewType=${options.viewType}`;
    if (options.calendarMonth !== undefined)
      query += `&calendarMonth=${options.calendarMonth}`;
    if (options.calendarYear !== undefined)
      query += `&calendarYear=${options.calendarYear}`;
    if (options.startOfWeek) query += `&startOfWeek=${options.startOfWeek}`;
    if (options.preferredLanguage)
      query += `&preferredLanguage=${options.preferredLanguage}`;
    if (options.today) query += `&today=${options.today}`;

    return `${serverConfig.apiBase}print/mealPlan/${mealPlanId}${query}`;
  },

  recipeTemplate(recipeId: string, modifiers: RecipeTemplateModifiers): string {
    const allModifiers = { version: window.version, ...modifiers };
    const modifierQuery = Object.entries(allModifiers)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    return `${serverConfig.apiBase}print/recipe/${recipeId}?${modifierQuery}`;
  },
};
