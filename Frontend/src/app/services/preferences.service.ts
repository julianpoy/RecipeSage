import { Injectable } from '@angular/core';

const PREFERENCE_LOCALSTORAGE_KEY = 'preferences';

export enum GlobalPreferenceKey {
  EnableSplitPane = 'global.enableSplitPane'
}

export enum MyRecipesPreferenceKey {
  EnableLabelIntersection = 'myRecipes.enableLabelIntersection',
  ShowLabels = 'myRecipes.showLabels',
  ShowLabelChips = 'myRecipes.showLabelChips',
  ShowImages = 'myRecipes.showImages',
  ShowSource = 'myRecipes.showSource',
  ViewType = 'myRecipes.viewType',
  SortBy = 'myRecipes.sortBy'
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
  GroupSimilar = 'ShoppingList.groupSimilar'
}

export interface AppPreferenceTypes {
  [GlobalPreferenceKey.EnableSplitPane]: boolean;

  [MyRecipesPreferenceKey.EnableLabelIntersection]: boolean;
  [MyRecipesPreferenceKey.ShowLabels]: boolean;
  [MyRecipesPreferenceKey.ShowLabelChips]: boolean;
  [MyRecipesPreferenceKey.ShowImages]: boolean;
  [MyRecipesPreferenceKey.ShowSource]: boolean;
  [MyRecipesPreferenceKey.ViewType]: 'tiles' | 'list';
  [MyRecipesPreferenceKey.SortBy]: '-title' | '- createdAt' | 'createdAt' | '- updatedAt' | 'updatedAt';

  [MealPlanPreferenceKey.ShowAddedBy]: boolean;
  [MealPlanPreferenceKey.ShowAddedOn]: boolean;
  [MealPlanPreferenceKey.StartOfWeek]: 'monday' | 'sunday';

  [ShoppingListPreferenceKey.SortBy]: 'createdAt' | '-createdAt' | '-title';
  [ShoppingListPreferenceKey.ShowAddedBy]: boolean;
  [ShoppingListPreferenceKey.ShowAddedOn]: boolean;
  [ShoppingListPreferenceKey.ShowRecipeTitle]: boolean;
  [ShoppingListPreferenceKey.GroupSimilar]: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {
  preferences: AppPreferenceTypes = {
    [GlobalPreferenceKey.EnableSplitPane]: false,

    [MyRecipesPreferenceKey.EnableLabelIntersection]: false,
    [MyRecipesPreferenceKey.ShowLabels]: true,
    [MyRecipesPreferenceKey.ShowLabelChips]: false,
    [MyRecipesPreferenceKey.ShowImages]: true,
    [MyRecipesPreferenceKey.ShowSource]: false,
    // TODO: Remove default list view after default settings go out
    // Show list by default on small screens
    [MyRecipesPreferenceKey.ViewType]: 'list' || Math.min(window.innerWidth, window.innerHeight) < 440 ? 'list' : 'tiles',
    [MyRecipesPreferenceKey.SortBy]: '-title',

    [MealPlanPreferenceKey.ShowAddedBy]: false,
    [MealPlanPreferenceKey.ShowAddedOn]: false,
    [MealPlanPreferenceKey.StartOfWeek]: 'monday',

    [ShoppingListPreferenceKey.SortBy]: '-createdAt',
    [ShoppingListPreferenceKey.ShowAddedBy]: false,
    [ShoppingListPreferenceKey.ShowAddedOn]: false,
    [ShoppingListPreferenceKey.ShowRecipeTitle]: true,
    [ShoppingListPreferenceKey.GroupSimilar]: false
  };

  constructor() {
    if (!localStorage.getItem(PREFERENCE_LOCALSTORAGE_KEY)) {
      this.loadOldPrefs();
      this.load();
      this.save();
      this.clearOldPrefs();
    } else {
      this.load();
    }
  }

  private loadOldPrefs() {
    try {
      const oldPreferences = {};

      oldPreferences[MyRecipesPreferenceKey.EnableLabelIntersection] = JSON.parse(localStorage.getItem('enableLabelIntersection'));
      oldPreferences[MyRecipesPreferenceKey.ShowLabels] = JSON.parse(localStorage.getItem('showLabels'));
      oldPreferences[MyRecipesPreferenceKey.ShowLabelChips] = JSON.parse(localStorage.getItem('showLabelChips'));
      oldPreferences[MyRecipesPreferenceKey.ShowImages] = JSON.parse(localStorage.getItem('showImages'));
      oldPreferences[MyRecipesPreferenceKey.ShowSource] = JSON.parse(localStorage.getItem('showSource'));
      oldPreferences[MyRecipesPreferenceKey.ViewType] = JSON.parse(localStorage.getItem('myRecipes.viewType'));
      oldPreferences[MyRecipesPreferenceKey.SortBy] = localStorage.getItem('sortBy');

      oldPreferences[MealPlanPreferenceKey.ShowAddedBy] = JSON.parse(localStorage.getItem('mealPlan.showAddedBy'));
      oldPreferences[MealPlanPreferenceKey.ShowAddedOn] = JSON.parse(localStorage.getItem('mealPlan.showAddedOn'));
      oldPreferences[MealPlanPreferenceKey.StartOfWeek] = localStorage.getItem('mealPlan.startOfWeek');

      oldPreferences[ShoppingListPreferenceKey.SortBy] = localStorage.getItem('shoppingList.sortBy');
      oldPreferences[ShoppingListPreferenceKey.ShowAddedBy] = JSON.parse(localStorage.getItem('shoppingList.showAddedBy'));
      oldPreferences[ShoppingListPreferenceKey.ShowAddedOn] = JSON.parse(localStorage.getItem('shoppingList.showAddedOn'));
      oldPreferences[ShoppingListPreferenceKey.ShowRecipeTitle] = JSON.parse(localStorage.getItem('shoppingList.showRecipeTitle'));
      oldPreferences[ShoppingListPreferenceKey.GroupSimilar] = JSON.parse(localStorage.getItem('shoppingList.groupSimilar'));

      for (const key in oldPreferences) {
        if (oldPreferences.hasOwnProperty(key)) {
          if (oldPreferences[key] != null) {
            this.preferences[key] = oldPreferences[key];
          }
        }
      }
    } catch (e) {}
  }

  private clearOldPrefs() {
    try {
      localStorage.removeItem('enableLabelIntersection');
      localStorage.removeItem('showLabels');
      localStorage.removeItem('showLabelChips');
      localStorage.removeItem('showImages');
      localStorage.removeItem('showSource');
      localStorage.removeItem('myRecipes.viewType');
      localStorage.removeItem('sortBy');

      localStorage.removeItem('mealPlan.showAddedBy');
      localStorage.removeItem('mealPlan.showAddedOn');
      localStorage.removeItem('mealPlan.startOfWeek');

      localStorage.removeItem('shoppingList.sortBy');
      localStorage.removeItem('shoppingList.showAddedBy');
      localStorage.removeItem('shoppingList.showAddedOn');
      localStorage.removeItem('shoppingList.showRecipeTitle');
      localStorage.removeItem('shoppingList.groupSimilar');
    } catch (e) {}
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
