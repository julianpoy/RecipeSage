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
    preferencesVersion: z.number().int().catch(0),

    /**
     * New preferences or modifications here must be backwards-compatible.
     * If you're adding a new preference, make sure to add either default value or have it be optional.
     */

    [GlobalPreferenceKey.EnableSplitPane]: z.boolean().catch(false),
    [GlobalPreferenceKey.Language]: z
      .enum(SupportedLanguages)
      .nullable()
      .catch(null),
    [GlobalPreferenceKey.FontSize]: z
      .enum(SupportedFontSize)
      .catch(SupportedFontSize.X1_0),
    [GlobalPreferenceKey.Theme]: z.enum(AppTheme).catch(AppTheme.Default),
    [GlobalPreferenceKey.PreferencesSync]: z
      .enum(PreferencesSync)
      .catch(PreferencesSync.Enabled),
    [GlobalPreferenceKey.StartPage]: z
      .enum(StartPageOptions)
      .catch(StartPageOptions.MyRecipes),
    [GlobalPreferenceKey.OfflineModePrompt]: z
      .enum(OfflineModePromptOptions)
      .catch(OfflineModePromptOptions.Ask),

    [MyRecipesPreferenceKey.EnableLabelIntersection]: z.boolean().catch(false),
    [MyRecipesPreferenceKey.ShowLabels]: z.boolean().catch(true),
    [MyRecipesPreferenceKey.ShowLabelChips]: z.boolean().catch(false),
    [MyRecipesPreferenceKey.ShowImages]: z.boolean().catch(true),
    [MyRecipesPreferenceKey.ShowSource]: z.boolean().catch(false),
    [MyRecipesPreferenceKey.ShowRecipeDescription]: z.boolean().catch(true),
    [MyRecipesPreferenceKey.ShowRating]: z.boolean().catch(false),
    [MyRecipesPreferenceKey.ViewType]: z
      .enum(MyRecipesViewTypeOptions)
      .catch(MyRecipesViewTypeOptions.Tiles),
    [MyRecipesPreferenceKey.SortBy]: z
      .enum(MyRecipesSortOptions)
      .catch(MyRecipesSortOptions.TitleAsc),
    [MyRecipesPreferenceKey.IncludeFriends]: z
      .enum(MyRecipesIncludeFriendsOptions)
      .catch(MyRecipesIncludeFriendsOptions.No),

    [RecipeDetailsPreferenceKey.EnableWakeLock]: z.boolean().catch(true),
    [RecipeDetailsPreferenceKey.AutoExpandNutrition]: z.boolean().catch(false),

    [CookModePreferenceKey.FontSize]: z
      .enum(SupportedFontSize)
      .catch(SupportedFontSize.PX20),

    [ManageLabelsPreferenceKey.ShowCreatedAt]: z.boolean().catch(true),

    [MeasurementConverterPreferenceKey.EnabledUnits]: z
      .array(z.string())
      .catch([...VOLUME_UNITS_COMMON, ...WEIGHT_UNITS_COMMON]),

    [MealPlanPreferenceKey.ShowAddedBy]: z.boolean().catch(false),
    [MealPlanPreferenceKey.ShowAddedOn]: z.boolean().catch(false),
    [MealPlanPreferenceKey.StartOfWeek]: z
      .enum(MealPlanStartOfWeekOptions)
      .catch(MealPlanStartOfWeekOptions.Monday),
    [MealPlanPreferenceKey.ViewType]: z
      .enum(MealPlanViewTypeOptions)
      .catch(MealPlanViewTypeOptions.Calendar),

    [ShoppingListPreferenceKey.SortBy]: z
      .enum(ShoppingListSortOptions)
      .catch(ShoppingListSortOptions.CreatedAtDesc),
    [ShoppingListPreferenceKey.ShowAddedBy]: z.boolean().catch(false),
    [ShoppingListPreferenceKey.ShowAddedOn]: z.boolean().catch(false),
    [ShoppingListPreferenceKey.ShowRecipeTitle]: z.boolean().catch(true),
    [ShoppingListPreferenceKey.PreferDelete]: z.boolean().catch(false),
    [ShoppingListPreferenceKey.GroupSimilar]: z.boolean().catch(true),
    [ShoppingListPreferenceKey.GroupCategories]: z.boolean().catch(true),
    [ShoppingListPreferenceKey.IgnoreItemTitles]: z.string().catch(""),
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
