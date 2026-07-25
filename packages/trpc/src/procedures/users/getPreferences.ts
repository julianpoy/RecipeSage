import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
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
import { z } from "zod";

const appPreferencesSchema = z
  .object({
    preferencesVersion: z.number().int().default(0),

    /**
     * New preferences or modifications here must be backwards-compatible.
     * If you're adding a new preference, make sure to add either default value or have it be optional.
     */

    [GlobalPreferenceKey.EnableSplitPane]: z.boolean().default(false),
    [GlobalPreferenceKey.Language]: z
      .enum(SupportedLanguages)
      .nullable()
      .default(null),
    [GlobalPreferenceKey.FontSize]: z
      .enum(SupportedFontSize)
      .default(SupportedFontSize.X1_0),
    [GlobalPreferenceKey.Theme]: z.enum(AppTheme).default(AppTheme.Default),
    [GlobalPreferenceKey.PreferencesSync]: z
      .enum(PreferencesSync)
      .default(PreferencesSync.Enabled),
    [GlobalPreferenceKey.StartPage]: z
      .enum(StartPageOptions)
      .default(StartPageOptions.MyRecipes),
    [GlobalPreferenceKey.OfflineModePrompt]: z
      .enum(OfflineModePromptOptions)
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
      .enum(MyRecipesViewTypeOptions)
      .default(MyRecipesViewTypeOptions.Tiles),
    [MyRecipesPreferenceKey.SortBy]: z
      .enum(MyRecipesSortOptions)
      .default(MyRecipesSortOptions.TitleAsc),
    [MyRecipesPreferenceKey.IncludeFriends]: z
      .enum(MyRecipesIncludeFriendsOptions)
      .default(MyRecipesIncludeFriendsOptions.No),

    [RecipeDetailsPreferenceKey.EnableWakeLock]: z.boolean().default(true),
    [RecipeDetailsPreferenceKey.AutoExpandNutrition]: z
      .boolean()
      .default(false),

    [CookModePreferenceKey.FontSize]: z
      .enum(SupportedFontSize)
      .default(SupportedFontSize.PX20),

    [ManageLabelsPreferenceKey.ShowCreatedAt]: z.boolean().default(true),

    [MeasurementConverterPreferenceKey.EnabledUnits]: z
      .array(z.string())
      .default([...VOLUME_UNITS_COMMON, ...WEIGHT_UNITS_COMMON]),

    [MealPlanPreferenceKey.ShowAddedBy]: z.boolean().default(false),
    [MealPlanPreferenceKey.ShowAddedOn]: z.boolean().default(false),
    [MealPlanPreferenceKey.StartOfWeek]: z
      .enum(MealPlanStartOfWeekOptions)
      .default(MealPlanStartOfWeekOptions.Monday),
    [MealPlanPreferenceKey.ViewType]: z
      .enum(MealPlanViewTypeOptions)
      .default(MealPlanViewTypeOptions.Calendar),

    [ShoppingListPreferenceKey.SortBy]: z
      .enum(ShoppingListSortOptions)
      .default(ShoppingListSortOptions.CreatedAtDesc),
    [ShoppingListPreferenceKey.ShowAddedBy]: z.boolean().default(false),
    [ShoppingListPreferenceKey.ShowAddedOn]: z.boolean().default(false),
    [ShoppingListPreferenceKey.ShowRecipeTitle]: z.boolean().default(true),
    [ShoppingListPreferenceKey.PreferDelete]: z.boolean().default(false),
    [ShoppingListPreferenceKey.GroupSimilar]: z.boolean().default(true),
    [ShoppingListPreferenceKey.GroupCategories]: z.boolean().default(true),
    [ShoppingListPreferenceKey.IgnoreItemTitles]: z.string().default(""),
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
