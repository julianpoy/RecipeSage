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
  PreferencesSync,
  RecipeDetailsPreferenceKey,
  ShoppingListPreferenceKey,
  ShoppingListSortOptions,
  StartPageOptions,
  SupportedFontSize,
  SupportedLanguages,
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
      preferencesVersion: z.number().min(0),

      [GlobalPreferenceKey.EnableSplitPane]: z.boolean(),
      [GlobalPreferenceKey.Language]: z
        .nativeEnum(SupportedLanguages)
        .nullable(),
      [GlobalPreferenceKey.FontSize]: z.nativeEnum(SupportedFontSize),
      [GlobalPreferenceKey.Theme]: z.nativeEnum(AppTheme),
      [GlobalPreferenceKey.PreferencesSync]: z.nativeEnum(PreferencesSync),
      [GlobalPreferenceKey.StartPage]: z.nativeEnum(StartPageOptions),

      [MyRecipesPreferenceKey.EnableLabelIntersection]: z.boolean(),
      [MyRecipesPreferenceKey.ShowLabels]: z.boolean(),
      [MyRecipesPreferenceKey.ShowLabelChips]: z.boolean(),
      [MyRecipesPreferenceKey.ShowImages]: z.boolean(),
      [MyRecipesPreferenceKey.ShowSource]: z.boolean(),
      [MyRecipesPreferenceKey.ShowRecipeDescription]: z.boolean(),
      [MyRecipesPreferenceKey.ViewType]: z.nativeEnum(MyRecipesViewTypeOptions),
      [MyRecipesPreferenceKey.SortBy]: z.nativeEnum(MyRecipesSortOptions),
      [MyRecipesPreferenceKey.IncludeFriends]: z.nativeEnum(
        MyRecipesIncludeFriendsOptions,
      ),

      [RecipeDetailsPreferenceKey.EnableWakeLock]: z.boolean(),
      [RecipeDetailsPreferenceKey.AutoExpandNutrition]: z.boolean(),

      [CookModePreferenceKey.FontSize]: z.nativeEnum(SupportedFontSize),

      [ManageLabelsPreferenceKey.ShowCreatedAt]: z.boolean(),

      [MeasurementConverterPreferenceKey.ShowFractions]: z.boolean(),

      [MealPlanPreferenceKey.ShowAddedBy]: z.boolean(),
      [MealPlanPreferenceKey.ShowAddedOn]: z.boolean(),
      [MealPlanPreferenceKey.StartOfWeek]: z.nativeEnum(
        MealPlanStartOfWeekOptions,
      ),
      [MealPlanPreferenceKey.ViewType]: z.nativeEnum(MealPlanViewTypeOptions),

      [ShoppingListPreferenceKey.SortBy]: z.nativeEnum(ShoppingListSortOptions),
      [ShoppingListPreferenceKey.ShowAddedBy]: z.boolean(),
      [ShoppingListPreferenceKey.ShowAddedOn]: z.boolean(),
      [ShoppingListPreferenceKey.ShowRecipeTitle]: z.boolean(),
      [ShoppingListPreferenceKey.PreferDelete]: z.boolean(),
      [ShoppingListPreferenceKey.GroupSimilar]: z.boolean(),
      [ShoppingListPreferenceKey.GroupCategories]: z.boolean(),
      [ShoppingListPreferenceKey.IgnoreItemTitles]: z.string().max(5000),

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
