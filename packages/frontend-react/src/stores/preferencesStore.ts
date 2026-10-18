import { create } from "zustand";
import {
  type AppPreferenceTypes,
  AppTheme,
  CookModePreferenceKey,
  GlobalPreferenceKey,
  ManageLabelsPreferenceKey,
  MealPlanPreferenceKey,
  MeasurementConverterPreferenceKey,
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
  VOLUME_UNITS_COMMON,
  WEIGHT_UNITS_COMMON,
} from "@recipesage/util/shared";
import { usersActions } from "../services/server-actions/usersActions";
import { session } from "../utils/session";

const PREFERENCE_LOCALSTORAGE_KEY = "preferences";

// Preference defaults - user preferences loaded locally will override
const createDefaultPreferences = (): AppPreferenceTypes => ({
  preferencesVersion: 0,

  [GlobalPreferenceKey.EnableSplitPane]: false,
  [GlobalPreferenceKey.Language]: null,
  [GlobalPreferenceKey.FontSize]: SupportedFontSize.X1_0,
  [GlobalPreferenceKey.Theme]: AppTheme.Default,
  [GlobalPreferenceKey.PreferencesSync]: PreferencesSync.Enabled,
  [GlobalPreferenceKey.StartPage]: StartPageOptions.MyRecipes,
  [GlobalPreferenceKey.OfflineModePrompt]: OfflineModePromptOptions.Ask,

  [MyRecipesPreferenceKey.EnableLabelIntersection]: false,
  [MyRecipesPreferenceKey.ShowLabels]: true,
  [MyRecipesPreferenceKey.ShowLabelChips]: false,
  [MyRecipesPreferenceKey.ShowImages]: true,
  [MyRecipesPreferenceKey.ShowSource]: false,
  [MyRecipesPreferenceKey.ShowRecipeDescription]: true,
  [MyRecipesPreferenceKey.ShowRating]: false,
  // Show list by default on small screens
  [MyRecipesPreferenceKey.ViewType]:
    Math.min(window.innerWidth, window.innerHeight) < 440
      ? MyRecipesViewTypeOptions.List
      : MyRecipesViewTypeOptions.Tiles,
  [MyRecipesPreferenceKey.SortBy]: MyRecipesSortOptions.TitleAsc,
  [MyRecipesPreferenceKey.IncludeFriends]: MyRecipesIncludeFriendsOptions.No,

  [RecipeDetailsPreferenceKey.EnableWakeLock]: true,
  [RecipeDetailsPreferenceKey.AutoExpandNutrition]: false,

  [CookModePreferenceKey.FontSize]: SupportedFontSize.PX20,

  [ManageLabelsPreferenceKey.ShowCreatedAt]: true,

  [MeasurementConverterPreferenceKey.EnabledUnits]: [
    ...VOLUME_UNITS_COMMON,
    ...WEIGHT_UNITS_COMMON,
  ],

  [MealPlanPreferenceKey.ShowAddedBy]: false,
  [MealPlanPreferenceKey.ShowAddedOn]: false,
  [MealPlanPreferenceKey.StartOfWeek]: MealPlanStartOfWeekOptions.Monday,
  [MealPlanPreferenceKey.ViewType]: MealPlanViewTypeOptions.Calendar,

  [ShoppingListPreferenceKey.SortBy]: ShoppingListSortOptions.CreatedAtDesc,
  [ShoppingListPreferenceKey.ShowAddedBy]: false,
  [ShoppingListPreferenceKey.ShowAddedOn]: false,
  [ShoppingListPreferenceKey.ShowRecipeTitle]: true,
  [ShoppingListPreferenceKey.PreferDelete]: false,
  [ShoppingListPreferenceKey.GroupSimilar]: true,
  [ShoppingListPreferenceKey.GroupCategories]: true,
  [ShoppingListPreferenceKey.IgnoreItemTitles]: "",
});

/**
 * Responsible for taking care of updates between preferences versions
 */
const patchPreferences = (
  preferences: Partial<AppPreferenceTypes>,
): Partial<AppPreferenceTypes> => {
  const mutatedPreferences = {
    ...preferences,
  };

  if (String(mutatedPreferences["myRecipes.sortBy"]) === "-title") {
    mutatedPreferences["myRecipes.sortBy"] = MyRecipesSortOptions.TitleAsc; // In past, the sort was accidentally flipped
  }

  const oldTheme = localStorage.getItem("theme");
  if (oldTheme) {
    const matchingTheme = Object.values(AppTheme).find(
      (theme) => theme === oldTheme,
    );
    if (matchingTheme) mutatedPreferences["global.theme"] = matchingTheme;
    localStorage.removeItem("theme");
  }

  return mutatedPreferences;
};

/**
 * Intended to be used to filter incoming preferences from the server
 * In order to have preferences that are local-only
 */
const filterRemotePreferences = (
  preferences: Partial<AppPreferenceTypes>,
): Partial<AppPreferenceTypes> => {
  const {
    // We do not want to sync preferencesSync itself since that would cause issues with the user setting a local value to disable this feature
    [GlobalPreferenceKey.PreferencesSync]: _preferencesSync,
    // We do not want to sync viewtype because it's different per-device based on screen size
    [MyRecipesPreferenceKey.ViewType]: _viewType,
    ...filteredPreferences
  } = preferences;

  return filteredPreferences;
};

const loadLocalPreferences = (): AppPreferenceTypes => {
  const preferences = createDefaultPreferences();

  try {
    const serialized = localStorage.getItem(PREFERENCE_LOCALSTORAGE_KEY);
    const savedPreferences = serialized ? JSON.parse(serialized) || {} : {};

    Object.assign(preferences, patchPreferences(savedPreferences));
  } catch (e) {
    console.error(e);
  }

  return preferences;
};

const isSyncEnabled = (preferences: AppPreferenceTypes) =>
  preferences[GlobalPreferenceKey.PreferencesSync] === PreferencesSync.Enabled;

interface PreferencesState {
  preferences: AppPreferenceTypes;
  setPreference: <K extends keyof AppPreferenceTypes>(
    key: K,
    value: AppPreferenceTypes[K],
  ) => void;
  save: (localOnly?: boolean) => void;
  loadRemote: () => Promise<void>;
  resetToDefaults: () => void;
}

export const preferencesStore = create<PreferencesState>((set, get) => ({
  preferences: loadLocalPreferences(),

  setPreference: (key, value) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        [key]: value,
      },
    }));
    get().save();
  },

  save: (localOnly) => {
    const { preferences } = get();

    try {
      const serialized = JSON.stringify(preferences);
      localStorage.setItem(PREFERENCE_LOCALSTORAGE_KEY, serialized);
    } catch (e) {
      console.error(e);
    }

    if (localOnly) return;
    if (!isSyncEnabled(preferences)) return;

    // Do not sync remote preferences if not logged in
    if (!session.isLoggedIn()) return;
    void usersActions.updatePreferences(preferences, {
      "*": () => {},
    });
  },

  loadRemote: async () => {
    if (!isSyncEnabled(get().preferences)) return;

    // Do not sync remote preferences if not logged in
    if (!session.isLoggedIn()) return;

    const remotePreferences = await usersActions.getPreferences({
      "*": () => {},
    });
    if (!remotePreferences) return;

    const filteredPreferences = filterRemotePreferences(
      patchPreferences(remotePreferences),
    );

    set((state) => ({
      preferences: {
        ...state.preferences,
        ...filteredPreferences,
      },
    }));
    get().save(true);
  },

  resetToDefaults: () => {
    localStorage.removeItem(PREFERENCE_LOCALSTORAGE_KEY);
    window.location.reload();
  },
}));
