import { Injectable } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface RecipeTemplateModifiers {
  version?: string,
  halfsheet?: boolean,
  verticalInstrIng?: boolean,
  titleImage?: boolean,
  hideNotes?: boolean,
  hideSource?: boolean,
  hideSourceURL?: boolean,
  printPreview?: boolean,
  showPrintButton?: boolean
}

export const RouteMap = {
  HomePage: {
    getPath: (folder: string) => `list/${folder}`,
    path: 'list/:folder',
  },
  AboutPage: {
    getPath: () => `about`,
    path: 'about',
  },
  AboutDetailsPage: {
    getPath: () => `about/details`,
    path: 'about/details',
  },
  LegalPage: {
    getPath: () => `legal`,
    path: 'legal',
  },
  ContributePage: {
    getPath: () => `contribute`,
    path: 'contribute',
  },
  ContributeCancelPage: {
    getPath: () => `contribute/cancel`,
    path: 'contribute/cancel',
  },
  ContributeThankYouPage: {
    getPath: () => `contribute/thankyou`,
    path: 'contribute/thankyou',
  },
  ReleaseNotesPage: {
    getPath: () => `release-notes`,
    path: 'release-notes',
  },
  TipsTricksTutorialsPage: {
    getPath: () => `tips-tricks-tutorials`,
    path: 'tips-tricks-tutorials',
  },
  WelcomePage: {
    getPath: () => `welcome`,
    path: 'welcome',
  },
  LoginPage: {
    getPath: () => `login`,
    path: 'login',
  },
  MealPlansPage: {
    getPath: () => `meal-planners`,
    path: 'meal-planners',
  },
  MealPlanPage: {
    getPath: (mealPlanId: string) => `meal-planners/${mealPlanId}`,
    path: 'meal-planners/:mealPlanId',
  },
  MessagesPage: {
    getPath: () => `messages`,
    path: 'messages',
  },
  MessageThreadPage: {
    getPath: (otherUserId: string) => `messages/${otherUserId}`,
    path: 'messages/:otherUserId',
  },
  EditRecipePage: {
    getPath: (recipeId: string) => `edit-recipe/${recipeId}`,
    path: 'edit-recipe/:recipeId',
  },
  RecipePage: {
    getPath: (recipeId: string) => `recipe/${recipeId}`,
    path: 'recipe/:recipeId',
  },
  SettingsPage: {
    getPath: () => `settings`,
    path: 'settings',
  },
  AccountPage: {
    getPath: () => `settings/account`,
    path: 'settings/account',
  },
  ExportPage: {
    getPath: () => `settings/export`,
    path: 'settings/export',
  },
  ImportPage: {
    getPath: () => `settings/import`,
    path: 'settings/import',
  },
  ImportLivingcookbookPage: {
    getPath: () => `settings/import/livingcookbook`,
    path: 'settings/import/livingcookbook',
  },
  ImportPaprikaPage: {
    getPath: () => `settings/import/paprika`,
    path: 'settings/import/paprika',
  },
  ImportPepperplatePage: {
    getPath: () => `settings/import/pepperplate`,
    path: 'settings/import/pepperplate',
  },
  ShoppingListsPage: {
    getPath: () => `shopping-lists`,
    path: 'shopping-lists',
  },
  ShoppingListPage: {
    getPath: (shoppingListId: string) => `shopping-lists/${shoppingListId}`,
    path: 'shopping-lists/:shoppingListId',
  }
};

// RouteMapAOT contains no functions for purposes of AOT - only route paths
export const RouteMapAOT: any = Object.keys(RouteMap).reduce((acc, routeName) => {
  acc[routeName] = {
    path: RouteMap[routeName].path
  };
  return acc;
}, {});

@Injectable({
  providedIn: 'root'
})
export class UtilService {

  lang = ((<any>window.navigator).userLanguage || window.navigator.language);

  devBase: string = localStorage.getItem('base') || `${window.location.protocol}//${window.location.hostname}/api/`;

  standardMessages = {
    offlineFetchMessage: 'It looks like you\'re offline. While offline, we\'re only able to fetch data you\'ve previously accessed on this device.',
    offlinePushMessage: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
    unexpectedError: 'An unexpected error occured. Please try again.',
    unauthorized: 'You are not authorized for this action! If you believe this is in error, please log out and log in using the side menu.'
  };

  constructor(public sanitizer: DomSanitizer) {}

  getBase(): string {
    return this.devBase;
  }

  getTokenQuery(): string {
    let token = localStorage.getItem('token');
    if (token) return `?token=${token}`;
    return `?false=false`;
  }

  generateTrustedRecipeTemplateURL(recipeId: string, modifiers: RecipeTemplateModifiers): SafeResourceUrl {
    let url = this.generateRecipeTemplateURL(recipeId, modifiers);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  generateRecipeTemplateURL(recipeId: string, modifiers: RecipeTemplateModifiers): string {
    modifiers = { version: (window as any).version, ...modifiers };
    let modifierQuery = Object.keys(modifiers)
      .filter(modifierKey => modifiers[modifierKey])
      .map(modifierKey => `${modifierKey}=${modifiers[modifierKey]}`)
      .join('&');

    var url = `${this.getBase()}embed/recipe/${recipeId}?${modifierQuery}`;

    return url;
  }

  formatDate(date, options?): string {
    options = options || {};
    var aFewMomentsAgoAfter = new Date();
    aFewMomentsAgoAfter.setMinutes(aFewMomentsAgoAfter.getMinutes() - 2);

    var todayAfter = new Date();
    todayAfter.setHours(0);
    todayAfter.setMinutes(0);
    todayAfter.setSeconds(0);
    todayAfter.setMilliseconds(0);

    var thisWeekAfter = new Date();
    thisWeekAfter.setDate(thisWeekAfter.getDate() - 7);

    var toFormat = new Date(date);

    if (options.now && aFewMomentsAgoAfter < toFormat) {
      return 'just now'
    }

    if (!options.times && todayAfter < toFormat) {
      return 'today';
    }

    if (options.times && todayAfter < toFormat) {
      return toFormat.toLocaleString(this.lang, {
        hour: 'numeric',
        minute: 'numeric'
      });
    }

    if (options.times && thisWeekAfter < toFormat) {
      return toFormat.toLocaleString(this.lang, {
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric'
      });
    }

    if (!options.times && thisWeekAfter < toFormat) {
      return toFormat.toLocaleString(this.lang, {
        weekday: 'long'
      });
    }

    if (!options.times) {
      return toFormat.toLocaleString(this.lang, {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      });
    } else {
      return toFormat.toLocaleString(this.lang, {
        hour: 'numeric',
        minute: 'numeric',
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }
}
