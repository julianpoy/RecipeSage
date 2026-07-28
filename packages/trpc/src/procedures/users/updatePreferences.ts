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
  VOLUME_UNITS_COMMON,
  WEIGHT_UNITS_COMMON,
} from "@recipesage/util/shared";

export const updatePreferences = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/updatePreferences",
      tags: ["users"],
      summary: "Replace the caller's stored app preferences",
      protect: true,
    },
  })
  .input(
    z.object({
      preferencesVersion: z.number().min(0).default(0),

      /**
       * New preferences or modifications here must be backwards-compatible.
       * If you're adding a new preference, make sure to add either default value or have it be optional.
       */

      [GlobalPreferenceKey.EnableSplitPane]: z.boolean().default(false),
      [GlobalPreferenceKey.Language]: z
        .nativeEnum(SupportedLanguages)
        .nullable()
        .default(null),
      [GlobalPreferenceKey.FontSize]: z
        .nativeEnum(SupportedFontSize)
        .default(SupportedFontSize.X1_0),
      [GlobalPreferenceKey.Theme]: z
        .nativeEnum(AppTheme)
        .default(AppTheme.Default),
      [GlobalPreferenceKey.PreferencesSync]: z
        .nativeEnum(PreferencesSync)
        .default(PreferencesSync.Enabled),
      [GlobalPreferenceKey.StartPage]: z
        .nativeEnum(StartPageOptions)
        .default(StartPageOptions.MyRecipes),
      [GlobalPreferenceKey.OfflineModePrompt]: z
        .nativeEnum(OfflineModePromptOptions)
        .default(OfflineModePromptOptions.Ask),

      [MyRecipesPreferenceKey.EnableLabelIntersection]: z
        .boolean()
        .default(false),
      [MyRecipesPreferenceKey.ShowLabels]: z.boolean().default(true),
      [MyRecipesPreferenceKey.ShowLabelChips]: z.boolean().default(false),
      [MyRecipesPreferenceKey.ShowImages]: z.boolean().default(true),
      [MyRecipesPreferenceKey.ShowSource]: z.boolean().default(false),
      [MyRecipesPreferenceKey.ShowRecipeDescription]: z.boolean().default(true),
      [MyRecipesPreferenceKey.ShowRating]: z.boolean().default(false),
      [MyRecipesPreferenceKey.ViewType]: z
        .nativeEnum(MyRecipesViewTypeOptions)
        .default(MyRecipesViewTypeOptions.Tiles),
      [MyRecipesPreferenceKey.SortBy]: z
        .nativeEnum(MyRecipesSortOptions)
        .default(MyRecipesSortOptions.TitleAsc),
      [MyRecipesPreferenceKey.IncludeFriends]: z
        .nativeEnum(MyRecipesIncludeFriendsOptions)
        .default(MyRecipesIncludeFriendsOptions.No),

      [RecipeDetailsPreferenceKey.EnableWakeLock]: z.boolean().default(true),
      [RecipeDetailsPreferenceKey.AutoExpandNutrition]: z
        .boolean()
        .default(false),

      [CookModePreferenceKey.FontSize]: z
        .nativeEnum(SupportedFontSize)
        .default(SupportedFontSize.PX20),

      [ManageLabelsPreferenceKey.ShowCreatedAt]: z.boolean().default(true),

      [MeasurementConverterPreferenceKey.EnabledUnits]: z
        .array(z.string())
        .default([...VOLUME_UNITS_COMMON, ...WEIGHT_UNITS_COMMON]),

      [MealPlanPreferenceKey.ShowAddedBy]: z.boolean().default(false),
      [MealPlanPreferenceKey.ShowAddedOn]: z.boolean().default(false),
      [MealPlanPreferenceKey.StartOfWeek]: z
        .nativeEnum(MealPlanStartOfWeekOptions)
        .default(MealPlanStartOfWeekOptions.Monday),
      [MealPlanPreferenceKey.ViewType]: z
        .nativeEnum(MealPlanViewTypeOptions)
        .default(MealPlanViewTypeOptions.Calendar),

      [ShoppingListPreferenceKey.SortBy]: z
        .nativeEnum(ShoppingListSortOptions)
        .default(ShoppingListSortOptions.CreatedAtDesc),
      [ShoppingListPreferenceKey.ShowAddedBy]: z.boolean().default(false),
      [ShoppingListPreferenceKey.ShowAddedOn]: z.boolean().default(false),
      [ShoppingListPreferenceKey.ShowRecipeTitle]: z.boolean().default(true),
      [ShoppingListPreferenceKey.PreferDelete]: z.boolean().default(false),
      [ShoppingListPreferenceKey.GroupSimilar]: z.boolean().default(true),
      [ShoppingListPreferenceKey.GroupCategories]: z.boolean().default(true),
      [ShoppingListPreferenceKey.IgnoreItemTitles]: z
        .string()
        .max(5000)
        .default(""),

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) satisfies z.ZodSchema<AppPreferenceTypes, any, any>,
  )
  .output(z.string())
  .mutation(async ({ ctx, input }) => {
    await prisma.user.update({
      where: {
        id: ctx.session.userId,
      },
      data: {
        preferences: input,
      },
    });

    return "Ok";
  });
