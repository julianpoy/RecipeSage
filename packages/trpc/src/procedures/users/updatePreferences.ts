import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import {
  AppPreferenceTypes,
  AppTheme,
  CookModePreferenceKey,
  GlobalPreferenceKey,
  ManageLabelsPreferenceKey,
  MeasurementConverterPreferenceKey,
  MealPlanPreferenceKey,
  MealPlanStartOfWeekOptions,
  MealPlanViewTypeOptions,
  MyRecipesIncludeFriendsOptions,
  MyRecipesPreferenceKey,
  MyRecipesSortOptions,
  MyRecipesViewTypeOptions,
  OfflineModePromptOptions,
  PreferencesSync,
  RecipeDetailsPreferenceKey,
  ShoppingListPreferenceKey,
  ShoppingListSortOptions,
  StartPageOptions,
  SupportedFontSize,
  SupportedLanguages,
} from "@recipesage/util/shared";

const appPreferencesUpdateSchema = z.object({
  preferencesVersion: z.number().min(0).optional(),

  /**
   * New preferences or modifications here must be backwards-compatible.
   * If you're adding a new preference, make sure to add either default value or have it be optional.
   */

  [GlobalPreferenceKey.EnableSplitPane]: z.boolean().optional(),
  [GlobalPreferenceKey.Language]: z
    .nativeEnum(SupportedLanguages)
    .nullable()
    .optional(),
  [GlobalPreferenceKey.FontSize]: z.nativeEnum(SupportedFontSize).optional(),
  [GlobalPreferenceKey.Theme]: z.nativeEnum(AppTheme).optional(),
  [GlobalPreferenceKey.PreferencesSync]: z
    .nativeEnum(PreferencesSync)
    .optional(),
  [GlobalPreferenceKey.StartPage]: z.nativeEnum(StartPageOptions).optional(),
  [GlobalPreferenceKey.OfflineModePrompt]: z
    .nativeEnum(OfflineModePromptOptions)
    .optional(),

  [MyRecipesPreferenceKey.EnableLabelIntersection]: z.boolean().optional(),
  [MyRecipesPreferenceKey.ShowLabels]: z.boolean().optional(),
  [MyRecipesPreferenceKey.ShowLabelChips]: z.boolean().optional(),
  [MyRecipesPreferenceKey.ShowImages]: z.boolean().optional(),
  [MyRecipesPreferenceKey.ShowSource]: z.boolean().optional(),
  [MyRecipesPreferenceKey.ShowRecipeDescription]: z.boolean().optional(),
  [MyRecipesPreferenceKey.ShowRating]: z.boolean().optional(),
  [MyRecipesPreferenceKey.ViewType]: z
    .nativeEnum(MyRecipesViewTypeOptions)
    .optional(),
  [MyRecipesPreferenceKey.SortBy]: z
    .nativeEnum(MyRecipesSortOptions)
    .optional(),
  [MyRecipesPreferenceKey.IncludeFriends]: z
    .nativeEnum(MyRecipesIncludeFriendsOptions)
    .optional(),

  [RecipeDetailsPreferenceKey.EnableWakeLock]: z.boolean().optional(),
  [RecipeDetailsPreferenceKey.AutoExpandNutrition]: z.boolean().optional(),

  [CookModePreferenceKey.FontSize]: z.nativeEnum(SupportedFontSize).optional(),

  [ManageLabelsPreferenceKey.ShowCreatedAt]: z.boolean().optional(),

  [MeasurementConverterPreferenceKey.EnabledUnits]: z
    .array(z.string())
    .optional(),

  [MealPlanPreferenceKey.ShowAddedBy]: z.boolean().optional(),
  [MealPlanPreferenceKey.ShowAddedOn]: z.boolean().optional(),
  [MealPlanPreferenceKey.StartOfWeek]: z
    .nativeEnum(MealPlanStartOfWeekOptions)
    .optional(),
  [MealPlanPreferenceKey.ViewType]: z
    .nativeEnum(MealPlanViewTypeOptions)
    .optional(),

  [ShoppingListPreferenceKey.SortBy]: z
    .nativeEnum(ShoppingListSortOptions)
    .optional(),
  [ShoppingListPreferenceKey.ShowAddedBy]: z.boolean().optional(),
  [ShoppingListPreferenceKey.ShowAddedOn]: z.boolean().optional(),
  [ShoppingListPreferenceKey.ShowRecipeTitle]: z.boolean().optional(),
  [ShoppingListPreferenceKey.PreferDelete]: z.boolean().optional(),
  [ShoppingListPreferenceKey.GroupSimilar]: z.boolean().optional(),
  [ShoppingListPreferenceKey.GroupCategories]: z.boolean().optional(),
  [ShoppingListPreferenceKey.IgnoreItemTitles]: z.string().max(5000).optional(),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) satisfies z.ZodSchema<Partial<AppPreferenceTypes>, any, any>;

const knownPreferenceKeys = new Set<string>(
  Object.keys(appPreferencesUpdateSchema.shape),
);

export const updatePreferences = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/updatePreferences",
      tags: ["users"],
      summary: "Update the caller's stored app preferences",
      protect: true,
    },
  })
  .input(appPreferencesUpdateSchema)
  .output(z.string())
  .mutation(async ({ ctx, input }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.session.userId,
      },
      select: {
        preferences: true,
      },
    });

    const storedPreferences =
      user.preferences &&
      typeof user.preferences === "object" &&
      !Array.isArray(user.preferences)
        ? user.preferences
        : {};

    const retainedPreferences = Object.fromEntries(
      Object.entries(storedPreferences).filter(([key]) =>
        knownPreferenceKeys.has(key),
      ),
    );

    const updatedPreferences = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    );

    await prisma.user.update({
      where: {
        id: ctx.session.userId,
      },
      data: {
        preferences: {
          ...retainedPreferences,
          ...updatedPreferences,
        },
      },
    });

    return "Ok";
  });
