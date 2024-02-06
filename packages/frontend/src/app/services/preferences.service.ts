import { Injectable, Injector } from "@angular/core";
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
} from "@recipesage/util";
import { TRPCService } from "./trpc.service";
import { UtilService } from "./util.service";
import { TranslateService } from "@ngx-translate/core";

const PREFERENCE_LOCALSTORAGE_KEY = "preferences";

@Injectable({
  providedIn: "root",
})
export class PreferencesService {
  // Preference defaults - user preferences loaded locally will override
  preferences: AppPreferenceTypes = {
    preferencesVersion: 0,

    [GlobalPreferenceKey.EnableSplitPane]: false,
    [GlobalPreferenceKey.EnableExperimentalOfflineCache]: false,
    [GlobalPreferenceKey.Language]: null,
    [GlobalPreferenceKey.FontSize]: SupportedFontSize.X1_0,
    [GlobalPreferenceKey.Theme]: AppTheme.Default,
    [GlobalPreferenceKey.PreferencesSync]: PreferencesSync.Enabled,

    [MyRecipesPreferenceKey.EnableLabelIntersection]: false,
    [MyRecipesPreferenceKey.ShowLabels]: true,
    [MyRecipesPreferenceKey.ShowLabelChips]: false,
    [MyRecipesPreferenceKey.ShowImages]: true,
    [MyRecipesPreferenceKey.ShowSource]: false,
    [MyRecipesPreferenceKey.ShowRecipeDescription]: true,
    // Show list by default on small screens
    [MyRecipesPreferenceKey.ViewType]:
      Math.min(window.innerWidth, window.innerHeight) < 440
        ? MyRecipesViewTypeOptions.List
        : MyRecipesViewTypeOptions.Tiles,
    [MyRecipesPreferenceKey.SortBy]: MyRecipesSortOptions.TitleAsc,
    [MyRecipesPreferenceKey.IncludeFriends]: MyRecipesIncludeFriendsOptions.No,

    [RecipeDetailsPreferenceKey.EnableWakeLock]: true,

    [ManageLabelsPreferenceKey.ShowCreatedAt]: true,

    [MealPlanPreferenceKey.ShowAddedBy]: false,
    [MealPlanPreferenceKey.ShowAddedOn]: false,
    [MealPlanPreferenceKey.StartOfWeek]: MealPlanStartOfWeekOptions.Monday,

    [ShoppingListPreferenceKey.SortBy]: ShoppingListSortOptions.CreatedAtDesc,
    [ShoppingListPreferenceKey.ShowAddedBy]: false,
    [ShoppingListPreferenceKey.ShowAddedOn]: false,
    [ShoppingListPreferenceKey.ShowRecipeTitle]: true,
    [ShoppingListPreferenceKey.PreferDelete]: false,
    [ShoppingListPreferenceKey.GroupSimilar]: true,
    [ShoppingListPreferenceKey.GroupCategories]: true,
    [ShoppingListPreferenceKey.IgnoreItemTitles]: "",
  };

  constructor(
    private trpcService: TRPCService,
    private injector: Injector,
    private translate: TranslateService,
  ) {
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
    this.trpcService.trpc.users.updatePreferences.mutate(this.preferences);
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

    // We do not want to sync preferencesSync itself since that would cause issues with the user setting a local value to disable this feature
    delete mutatedPreferences["global.preferencesSync"];
    // We do not want to sync viewtype because it's different per-device based on screen size
    delete mutatedPreferences["myRecipes.viewType"];

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

    if (
      this.preferences[GlobalPreferenceKey.PreferencesSync] !==
      PreferencesSync.Enabled
    )
      return;

    // Do not sync remote preferences if not logged in
    if (!localStorage.getItem("token")) return;
    this.trpcService
      .handle(this.trpcService.trpc.users.getPreferences.query(), {
        "*": () => {},
      })
      .then((remotePreferences) => {
        if (remotePreferences) {
          const patchedPreferences = this.patchPreferences(remotePreferences);
          const filteredPreferences =
            this.filterRemotePreferences(patchedPreferences);

          const previousLanguagePref = this.preferences["global.language"];
          const previousTheme = this.preferences["global.theme"];
          Object.assign(this.preferences, filteredPreferences);

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
        }
      });
  }

  resetToDefaults() {
    localStorage.removeItem(PREFERENCE_LOCALSTORAGE_KEY);
    window.location.reload();
  }
}
