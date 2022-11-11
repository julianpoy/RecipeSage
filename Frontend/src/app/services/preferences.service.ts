import { Injectable } from '@angular/core';

const PREFERENCE_LOCALSTORAGE_KEY = 'preferences';

export enum SupportedLanguages {
  EN_US = 'en-us',
  IT_IT = 'it-it',
  DE_DE = 'de-de',
};

export enum GlobalPreferenceKey {
  EnableSplitPane = 'global.enableSplitPane',
  EnableExperimentalOfflineCache = 'global.enableExperimentalOfflineCache',
  Language = 'global.language'
}

export enum MyRecipesPreferenceKey {
  EnableLabelIntersection = 'myRecipes.enableLabelIntersection',
  ShowLabels = 'myRecipes.showLabels',
  ShowLabelChips = 'myRecipes.showLabelChips',
  ShowImages = 'myRecipes.showImages',
  ShowSource = 'myRecipes.showSource',
  ShowRecipeDescription = 'myRecipes.showRecipeDescription',
  ViewType = 'myRecipes.viewType',
  SortBy = 'myRecipes.sortBy'
}

export enum RecipeDetailsPreferenceKey {
  EnableWakeLock = 'recipeDetails.enableWakeLock',
}

export enum ManageLabelsPreferenceKey {
  ShowCreatedAt = 'manageLabels.showCreatedAt'
}

export enum MealPlanPreferenceKey {
  ShowAddedBy = 'MealPlan.showAddedBy',
  ShowAddedOn = 'MealPlan.showAddedOn',
  StartOfWeek = 'MealPlan.startOfWeek'
}

export enum ShoppingListPreferenceKey {
  SortBy = 'ShoppingList.sortBy',
  ShowAddedBy = 'ShoppingList.showAddedBy',
  ShowAddedOn = 'ShoppingList.showAddedOn',
  ShowRecipeTitle = 'ShoppingList.showRecipeTitle',
  PreferDelete = 'ShoppingList.preferDelete',
  GroupSimilar = 'ShoppingList.groupSimilar',
  GroupCategories = 'ShoppingList.groupCategories'
}

export interface AppPreferenceTypes {
  [GlobalPreferenceKey.EnableSplitPane]: boolean;
  [GlobalPreferenceKey.EnableExperimentalOfflineCache]: boolean;
  [GlobalPreferenceKey.Language]: null | SupportedLanguages;

  [MyRecipesPreferenceKey.EnableLabelIntersection]: boolean;
  [MyRecipesPreferenceKey.ShowLabels]: boolean;
  [MyRecipesPreferenceKey.ShowLabelChips]: boolean;
  [MyRecipesPreferenceKey.ShowImages]: boolean;
  [MyRecipesPreferenceKey.ShowSource]: boolean;
  [MyRecipesPreferenceKey.ShowRecipeDescription]: boolean;
  [MyRecipesPreferenceKey.ViewType]: 'tiles' | 'list';
  [MyRecipesPreferenceKey.SortBy]: '-title' | '- createdAt' | 'createdAt' | '- updatedAt' | 'updatedAt';

  [RecipeDetailsPreferenceKey.EnableWakeLock]: boolean;

  [ManageLabelsPreferenceKey.ShowCreatedAt]: boolean;

  [MealPlanPreferenceKey.ShowAddedBy]: boolean;
  [MealPlanPreferenceKey.ShowAddedOn]: boolean;
  [MealPlanPreferenceKey.StartOfWeek]: 'monday' | 'sunday';

  [ShoppingListPreferenceKey.SortBy]: 'createdAt' | '-createdAt' | '-title';
  [ShoppingListPreferenceKey.ShowAddedBy]: boolean;
  [ShoppingListPreferenceKey.ShowAddedOn]: boolean;
  [ShoppingListPreferenceKey.ShowRecipeTitle]: boolean;
  [ShoppingListPreferenceKey.PreferDelete]: boolean;
  [ShoppingListPreferenceKey.GroupSimilar]: boolean;
  [ShoppingListPreferenceKey.GroupCategories]: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  // Preference defaults - user preferences loaded locally will override
  preferences: AppPreferenceTypes = {
    [GlobalPreferenceKey.EnableSplitPane]: false,
    [GlobalPreferenceKey.EnableExperimentalOfflineCache]: false,
    [GlobalPreferenceKey.Language]: null,

    [MyRecipesPreferenceKey.EnableLabelIntersection]: false,
    [MyRecipesPreferenceKey.ShowLabels]: true,
    [MyRecipesPreferenceKey.ShowLabelChips]: false,
    [MyRecipesPreferenceKey.ShowImages]: true,
    [MyRecipesPreferenceKey.ShowSource]: false,
    [MyRecipesPreferenceKey.ShowRecipeDescription]: true,
    // Show list by default on small screens
    [MyRecipesPreferenceKey.ViewType]: Math.min(window.innerWidth, window.innerHeight) < 440 ? 'list' : 'tiles',
    [MyRecipesPreferenceKey.SortBy]: '-title',

    [RecipeDetailsPreferenceKey.EnableWakeLock]: true,

    [ManageLabelsPreferenceKey.ShowCreatedAt]: true,

    [MealPlanPreferenceKey.ShowAddedBy]: false,
    [MealPlanPreferenceKey.ShowAddedOn]: false,
    [MealPlanPreferenceKey.StartOfWeek]: 'monday',

    [ShoppingListPreferenceKey.SortBy]: '-createdAt',
    [ShoppingListPreferenceKey.ShowAddedBy]: false,
    [ShoppingListPreferenceKey.ShowAddedOn]: false,
    [ShoppingListPreferenceKey.ShowRecipeTitle]: true,
    [ShoppingListPreferenceKey.PreferDelete]: false,
    [ShoppingListPreferenceKey.GroupSimilar]: true,
    [ShoppingListPreferenceKey.GroupCategories]: true
  };

  constructor() {
    this.load();
    this.save();
  }

  save() {
    try {
      const serialized = JSON.stringify(this.preferences);
      localStorage.setItem(PREFERENCE_LOCALSTORAGE_KEY, serialized);
    } catch (e) { }
  }

  private load() {
    try {
      const serialized = localStorage.getItem(PREFERENCE_LOCALSTORAGE_KEY);
      const savedPreferences = JSON.parse(serialized) || {};

      Object.assign(this.preferences, savedPreferences);
    } catch (e) { }
  }

  resetToDefaults() {
    try {
      localStorage.removeItem(PREFERENCE_LOCALSTORAGE_KEY);
      window.location.reload();
    } catch (e) { }
  }
}
