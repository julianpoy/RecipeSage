/**
 * All supported languages by RecipeSage.
 *
 * NOTE: To add a language, you'll need to:
 * 1. Add the language json file to the frontend assets/i18n folder
 * 2. Add the language to this enum
 * 3. Add the language to the util service `defaultLocality`
 **/
export enum SupportedLanguages {
  EN_US = "en-us", // English, United States
  IT_IT = "it-it", // Italian, Italy
  DE_DE = "de-de", // German, Germany
  UK_UA = "uk-ua", // Ukrainian, Ukraine
  HE = "he", // Hebrew
  ES_ES = "es-es", // Spanish, Spain
  FR_FR = "fr-fr", // French, France
  RU_RU = "ru-ru", // Russian, Russia
  HU_HU = "hu-hu", // Hungarian, Hungary
  DA_DK = "da-dk", // Danish, Denmark
  ZH_CN = "zh-cn", // Chinese (Simplified), China
  PT_PT = "pt-pt", // Portugese, Portugal
  NL = "nl", // Dutch
  PL_PL = "pl-pl", // Polish, Poland
  JA_JP = "ja-jp", // Japanese, Japan
  LT_LT = "lt-lt", // Lithuanian, Lithuania
  EU = "eu", // Basque
}

export enum SupportedFontSize {
  X1_0 = "1rem",
  PX14 = "14px",
  PX16 = "16px",
  PX18 = "18px",
  PX20 = "20px",
  PX22 = "22px",
  PX24 = "24px",
}

export enum AppTheme {
  Default = "default",
  Light = "light",
  Dark = "dark",
  Black = "black",
  Midnight = "midnight",
}

export enum PreferencesSync {
  Enabled = "enabled",
  Disabled = "disabled",
}

export enum MyRecipesViewTypeOptions {
  Tiles = "tiles",
  List = "list",
  Compact = "compact",
}

export enum MyRecipesSortOptions {
  TitleAsc = "title",
  CreatedAtDesc = "-createdAt",
  CreatedAtAsc = "createdAt",
  UpdatedAtDesc = "-updatedAt",
  UpdatedAtAsc = "updatedAt",
}

export enum MyRecipesIncludeFriendsOptions {
  Yes = "yes",
  No = "no",
  Search = "search",
  Browse = "browse",
}

export enum MealPlanStartOfWeekOptions {
  Monday = "monday",
  Sunday = "sunday",
}

export enum ShoppingListSortOptions {
  TitleAsc = "title",
  TitleDesc = "-title",
  CreatedAtAsc = "createdAt",
  CreatedAtDesc = "-createdAt",
}

export enum GlobalPreferenceKey {
  EnableSplitPane = "global.enableSplitPane",
  Language = "global.language",
  FontSize = "global.fontSize",
  Theme = "global.theme",
  PreferencesSync = "global.preferencesSync",
}

export enum MyRecipesPreferenceKey {
  EnableLabelIntersection = "myRecipes.enableLabelIntersection",
  ShowLabels = "myRecipes.showLabels",
  ShowLabelChips = "myRecipes.showLabelChips",
  ShowImages = "myRecipes.showImages",
  ShowSource = "myRecipes.showSource",
  ShowRecipeDescription = "myRecipes.showRecipeDescription",
  ViewType = "myRecipes.viewType",
  SortBy = "myRecipes.sortBy",
  IncludeFriends = "myRecipes.includeFriends",
}

export enum RecipeDetailsPreferenceKey {
  EnableWakeLock = "recipeDetails.enableWakeLock",
}

export enum ManageLabelsPreferenceKey {
  ShowCreatedAt = "manageLabels.showCreatedAt",
}

export enum MealPlanPreferenceKey {
  ShowAddedBy = "MealPlan.showAddedBy",
  ShowAddedOn = "MealPlan.showAddedOn",
  StartOfWeek = "MealPlan.startOfWeek",
}

export enum ShoppingListPreferenceKey {
  SortBy = "ShoppingList.sortBy",
  ShowAddedBy = "ShoppingList.showAddedBy",
  ShowAddedOn = "ShoppingList.showAddedOn",
  ShowRecipeTitle = "ShoppingList.showRecipeTitle",
  PreferDelete = "ShoppingList.preferDelete",
  GroupSimilar = "ShoppingList.groupSimilar",
  GroupCategories = "ShoppingList.groupCategories",
  IgnoreItemTitles = "ShoppingList.ignoreItemTitles",
}

export interface AppPreferenceTypes {
  preferencesVersion: number;

  [GlobalPreferenceKey.EnableSplitPane]: boolean;
  [GlobalPreferenceKey.Language]: null | SupportedLanguages;
  [GlobalPreferenceKey.FontSize]: SupportedFontSize;
  [GlobalPreferenceKey.Theme]: AppTheme;
  [GlobalPreferenceKey.PreferencesSync]: PreferencesSync;

  [MyRecipesPreferenceKey.EnableLabelIntersection]: boolean;
  [MyRecipesPreferenceKey.ShowLabels]: boolean;
  [MyRecipesPreferenceKey.ShowLabelChips]: boolean;
  [MyRecipesPreferenceKey.ShowImages]: boolean;
  [MyRecipesPreferenceKey.ShowSource]: boolean;
  [MyRecipesPreferenceKey.ShowRecipeDescription]: boolean;
  [MyRecipesPreferenceKey.ViewType]: MyRecipesViewTypeOptions;
  [MyRecipesPreferenceKey.SortBy]: MyRecipesSortOptions;
  [MyRecipesPreferenceKey.IncludeFriends]: MyRecipesIncludeFriendsOptions;

  [RecipeDetailsPreferenceKey.EnableWakeLock]: boolean;

  [ManageLabelsPreferenceKey.ShowCreatedAt]: boolean;

  [MealPlanPreferenceKey.ShowAddedBy]: boolean;
  [MealPlanPreferenceKey.ShowAddedOn]: boolean;
  [MealPlanPreferenceKey.StartOfWeek]: MealPlanStartOfWeekOptions;

  [ShoppingListPreferenceKey.SortBy]: ShoppingListSortOptions;
  [ShoppingListPreferenceKey.ShowAddedBy]: boolean;
  [ShoppingListPreferenceKey.ShowAddedOn]: boolean;
  [ShoppingListPreferenceKey.ShowRecipeTitle]: boolean;
  [ShoppingListPreferenceKey.PreferDelete]: boolean;
  [ShoppingListPreferenceKey.GroupSimilar]: boolean;
  [ShoppingListPreferenceKey.GroupCategories]: boolean;
  [ShoppingListPreferenceKey.IgnoreItemTitles]: string;
}
