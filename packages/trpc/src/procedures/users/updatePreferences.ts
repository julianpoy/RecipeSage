import { prisma } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { validateSession } from "../../utils/validateSession";
import { z } from "zod";
import {
  AppPreferenceTypes,
  AppTheme,
  GlobalPreferenceKey,
  ManageLabelsPreferenceKey,
  MealPlanPreferenceKey,
  MealPlanStartOfWeekOptions,
  MyRecipesIncludeFriendsOptions,
  MyRecipesPreferenceKey,
  MyRecipesSortOptions,
  MyRecipesViewTypeOptions,
  PreferencesSync,
  RecipeDetailsPreferenceKey,
  ShoppingListPreferenceKey,
  ShoppingListSortOptions,
  SupportedFontSize,
  SupportedLanguages,
} from "@recipesage/util";

export const updatePreferences = publicProcedure
  .input(
    z.object({
      preferencesVersion: z.number().min(0),

      [GlobalPreferenceKey.EnableSplitPane]: z.boolean(),
      [GlobalPreferenceKey.EnableExperimentalOfflineCache]: z.boolean(),
      [GlobalPreferenceKey.Language]: z
        .nativeEnum(SupportedLanguages)
        .nullable(),
      [GlobalPreferenceKey.FontSize]: z.nativeEnum(SupportedFontSize),
      [GlobalPreferenceKey.Theme]: z.nativeEnum(AppTheme),
      [GlobalPreferenceKey.PreferencesSync]: z.nativeEnum(PreferencesSync),

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

      [ManageLabelsPreferenceKey.ShowCreatedAt]: z.boolean(),

      [MealPlanPreferenceKey.ShowAddedBy]: z.boolean(),
      [MealPlanPreferenceKey.ShowAddedOn]: z.boolean(),
      [MealPlanPreferenceKey.StartOfWeek]: z.nativeEnum(
        MealPlanStartOfWeekOptions,
      ),

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
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateSession(session);

    await prisma.user.update({
      where: {
        id: session.userId,
      },
      data: {
        preferences: input,
      },
    });

    return "Ok";
  });
