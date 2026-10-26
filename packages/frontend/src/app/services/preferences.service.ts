import { Injectable, Injector, inject } from "@angular/core";
import {
  AppPreferenceTypes,
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
  RecipeDetailsLayoutOptions,
  ShoppingListPreferenceKey,
  ShoppingListSortOptions,
  StartPageOptions,
  SupportedFontSize,
  VOLUME_UNITS_COMMON,
  WEIGHT_UNITS_COMMON,
} from "@recipesage/util/shared";
import { ServerActionsService } from "./server-actions.service";
import { UtilService } from "./util.service";
import { TranslateService } from "@ngx-translate/core";
import { EventName, EventService } from "./event.service";

const PREFERENCE_LOCALSTORAGE_KEY = "preferences";

const LOCAL_ONLY_PREFERENCE_KEYS: (keyof AppPreferenceTypes)[] = [
  // We do not want to sync preferencesSync itself since that would cause issues with the user setting a local value to disable this feature
  GlobalPreferenceKey.PreferencesSync,
  // We do not want to sync viewtype because it's different per-device based on screen size
  MyRecipesPreferenceKey.ViewType,
  RecipeDetailsPreferenceKey.Layout,
];

@Injectable({
  providedIn: "root",
})
export class PreferencesService {
  private serverActionsService = inject(ServerActionsService);
  private injector = inject(Injector);
  private translate = inject(TranslateService);
  private events = inject(EventService);

  // Preference defaults - user preferences loaded locally will override
  preferences: AppPreferenceTypes = {
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
    [RecipeDetailsPreferenceKey.Layout]: RecipeDetailsLayoutOptions.Automatic,

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
  };

  private syncedPreferenceValues: Record<string, string> = {};

  constructor() {
    this.load();
  }

  save(localOnly?: boolean) {
    try {
      const serialized = JSON.stringify(this.preferences);
      localStorage.setItem(PREFERENCE_LOCALSTORAGE_KEY, serialized);
    } catch (e) {
      console.error(e);
    }

    if (localOnly) return;
    if (
      this.preferences[GlobalPreferenceKey.PreferencesSync] !==
      PreferencesSync.Enabled
    )
      return;

    // Do not sync remote preferences if not logged in
    if (!localStorage.getItem("token")) return;

    const preferenceValues = this.getSerializedPreferenceValues();
    const changedPreferences = Object.fromEntries(
      Object.entries(this.preferences).filter(
        ([key]) =>
          !LOCAL_ONLY_PREFERENCE_KEYS.some(
            (localOnlyKey) => localOnlyKey === key,
          ) && preferenceValues[key] !== this.syncedPreferenceValues[key],
      ),
    );
    if (!Object.keys(changedPreferences).length) return;

    this.serverActionsService.users
      .updatePreferences(changedPreferences, {
        "*": () => {},
      })
      .then((response) => {
        if (!response) return;

        for (const key of Object.keys(changedPreferences)) {
          this.syncedPreferenceValues[key] = preferenceValues[key];
        }
      });
  }

  private getSerializedPreferenceValues() {
    return Object.fromEntries(
      Object.entries(this.preferences).map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]),
    );
  }

  /**
   * Responsible for taking care of updates between preferences versions
   */
  private patchPreferences(preferences: AppPreferenceTypes) {
    const mutatedPreferences = {
      ...preferences,
    };

    if ((mutatedPreferences["myRecipes.sortBy"] as any) === "-title") {
      mutatedPreferences["myRecipes.sortBy"] = MyRecipesSortOptions.TitleAsc; // In past, the sort was accidentally flipped
    }

    const oldTheme = localStorage.getItem("theme");
    if (oldTheme) {
      mutatedPreferences["global.theme"] = oldTheme as AppTheme;
      localStorage.removeItem("theme");
    }

    return mutatedPreferences;
  }

  /**
   * Intended to be used to filter incoming preferences from the server
   * In order to have preferences that are local-only
   */
  private filterRemotePreferences(preferences: AppPreferenceTypes) {
    const mutatedPreferences = {
      ...preferences,
    } as Partial<AppPreferenceTypes>;

    for (const key of LOCAL_ONLY_PREFERENCE_KEYS) {
      delete mutatedPreferences[key];
    }

    return mutatedPreferences;
  }

  load() {
    try {
      const serialized = localStorage.getItem(PREFERENCE_LOCALSTORAGE_KEY);
      const savedPreferences = serialized ? JSON.parse(serialized) || {} : {};

      const patchedPreferences = this.patchPreferences(savedPreferences);

      Object.assign(this.preferences, patchedPreferences);
    } catch (e) {
      console.error(e);
    }

    this.syncedPreferenceValues = this.getSerializedPreferenceValues();

    if (
      this.preferences[GlobalPreferenceKey.PreferencesSync] !==
      PreferencesSync.Enabled
    )
      return;

    // Do not sync remote preferences if not logged in
    if (!localStorage.getItem("token")) return;
    this.serverActionsService.users
      .getPreferences({
        "*": () => {},
      })
      .then((remotePreferences) => {
        if (remotePreferences) {
          const patchedPreferences = this.patchPreferences(remotePreferences);
          const filteredPreferences =
            this.filterRemotePreferences(patchedPreferences);

          const previousLanguagePref = this.preferences["global.language"];
          const previousTheme = this.preferences["global.theme"];
          const previousSplitPane = this.preferences["global.enableSplitPane"];
          Object.assign(this.preferences, filteredPreferences);
          this.syncedPreferenceValues = this.getSerializedPreferenceValues();

          this.save(true);

          // Must be injected async to avoid cyclic dependency
          const utilService = this.injector.get(UtilService);

          utilService.setFontSize(this.preferences["global.fontSize"]);

          const language =
            this.preferences["global.language"] ||
            utilService.getAppBrowserLang();
          if (previousLanguagePref !== this.preferences["global.language"]) {
            this.translate.use(language);
            utilService.setHtmlBrowserLang(language);
          }

          if (previousTheme !== this.preferences["global.theme"]) {
            utilService.setAppTheme(this.preferences["global.theme"]);
          }
          if (
            previousSplitPane !== this.preferences["global.enableSplitPane"]
          ) {
            this.events.publish(EventName.ApplicationSplitPaneChanged);
          }
        }
      });
  }

  resetToDefaults() {
    localStorage.removeItem(PREFERENCE_LOCALSTORAGE_KEY);
    window.location.reload();
  }
}
