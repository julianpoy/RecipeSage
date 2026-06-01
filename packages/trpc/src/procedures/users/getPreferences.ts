import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import {
  AppPreferenceTypes,
  AppTheme,
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
import { z } from "zod";

const appPreferencesSchema = z
  .object({
    preferencesVersion: z.number().int(),

    [GlobalPreferenceKey.EnableSplitPane]: z.boolean(),
    [GlobalPreferenceKey.Language]: z.enum(SupportedLanguages).nullable(),
    [GlobalPreferenceKey.FontSize]: z.enum(SupportedFontSize),
    [GlobalPreferenceKey.Theme]: z.enum(AppTheme),
    [GlobalPreferenceKey.PreferencesSync]: z.enum(PreferencesSync),
    [GlobalPreferenceKey.StartPage]: z.enum(StartPageOptions),

    [MyRecipesPreferenceKey.EnableLabelIntersection]: z.boolean(),
    [MyRecipesPreferenceKey.ShowLabels]: z.boolean(),
    [MyRecipesPreferenceKey.ShowLabelChips]: z.boolean(),
    [MyRecipesPreferenceKey.ShowImages]: z.boolean(),
    [MyRecipesPreferenceKey.ShowSource]: z.boolean(),
    [MyRecipesPreferenceKey.ShowRecipeDescription]: z.boolean(),
    [MyRecipesPreferenceKey.ViewType]: z.enum(MyRecipesViewTypeOptions),
    [MyRecipesPreferenceKey.SortBy]: z.enum(MyRecipesSortOptions),
    [MyRecipesPreferenceKey.IncludeFriends]: z.enum(
      MyRecipesIncludeFriendsOptions,
    ),

    [RecipeDetailsPreferenceKey.EnableWakeLock]: z.boolean(),
    [RecipeDetailsPreferenceKey.AutoExpandNutrition]: z.boolean(),

    [ManageLabelsPreferenceKey.ShowCreatedAt]: z.boolean(),

    [MeasurementConverterPreferenceKey.ShowFractions]: z.boolean(),

    [MealPlanPreferenceKey.ShowAddedBy]: z.boolean(),
    [MealPlanPreferenceKey.ShowAddedOn]: z.boolean(),
    [MealPlanPreferenceKey.StartOfWeek]: z.enum(MealPlanStartOfWeekOptions),
    [MealPlanPreferenceKey.ViewType]: z.enum(MealPlanViewTypeOptions),

    [ShoppingListPreferenceKey.SortBy]: z.enum(ShoppingListSortOptions),
    [ShoppingListPreferenceKey.ShowAddedBy]: z.boolean(),
    [ShoppingListPreferenceKey.ShowAddedOn]: z.boolean(),
    [ShoppingListPreferenceKey.ShowRecipeTitle]: z.boolean(),
    [ShoppingListPreferenceKey.PreferDelete]: z.boolean(),
    [ShoppingListPreferenceKey.GroupSimilar]: z.boolean(),
    [ShoppingListPreferenceKey.GroupCategories]: z.boolean(),
    [ShoppingListPreferenceKey.IgnoreItemTitles]: z.string(),
  })
  .nullable();

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof appPreferencesSchema
> satisfies AppPreferenceTypes | null;
const _checkTypeSatisfiesSchema =
  {} as AppPreferenceTypes | null satisfies z.infer<
    typeof appPreferencesSchema
  >;

export const getPreferences = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/getPreferences",
      tags: ["users"],
      summary: "Get the caller's stored app preferences",
      protect: true,
    },
  })
  .output(appPreferencesSchema)
  .query(async ({ ctx }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.session.userId,
      },
    });

    // Cast to unknown since there is no good way of typing prisma json fields
    // Field is optional, so nullable
    const preferences =
      user.preferences as unknown as AppPreferenceTypes | null;

    return preferences;
  });
