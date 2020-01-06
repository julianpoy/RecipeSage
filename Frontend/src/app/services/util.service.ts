import { Injectable } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface RecipeTemplateModifiers {
  version?: string;
  halfsheet?: boolean;
  verticalInstrIng?: boolean;
  titleImage?: boolean;
  hideNotes?: boolean;
  hideSource?: boolean;
  hideSourceURL?: boolean;
  printPreview?: boolean;
  showPrintButton?: boolean;
}

// TODO: Create more types for various page getPath methods
export enum AuthType {
  Login = 'login',
  Register = 'register'
}

export const RouteMap = {
  HomePage: {
    getPath(folder: string) { return `/list/${folder}`; },
    path: 'list/:folder',
  },
  LabelsPage: {
    getPath() { return `labels`; },
    path: 'labels',
  },
  AboutPage: {
    getPath() { return `/about`; },
    path: 'about',
  },
  AboutDetailsPage: {
    getPath() { return `/about/details`; },
    path: 'about/details',
  },
  ContactPage: {
    getPath() { return `/about/contact`; },
    path: 'about/contact',
  },
  LegalPage: {
    getPath() { return `/legal`; },
    path: 'legal',
  },
  ContributePage: {
    getPath() { return `/contribute`; },
    path: 'contribute',
  },
  ContributeCancelPage: {
    getPath() { return `/contribute/cancel`; },
    path: 'contribute/cancel',
  },
  ContributeThankYouPage: {
    getPath() { return `/contribute/thankyou`; },
    path: 'contribute/thankyou',
  },
  ReleaseNotesPage: {
    getPath() { return `/release-notes`; },
    path: 'release-notes',
  },
  TipsTricksTutorialsPage: {
    getPath() { return `/tips-tricks-tutorials`; },
    path: 'tips-tricks-tutorials',
  },
  WelcomePage: {
    getPath() { return `/welcome`; },
    path: 'welcome',
  },
  AuthPage: {
    getPath(authType: AuthType) { return `/auth/${authType}`; },
    path: 'auth/:authType',
  },
  MealPlansPage: {
    getPath() { return `/meal-planners`; },
    path: 'meal-planners',
  },
  MealPlanPage: {
    getPath(mealPlanId: string) { return `/meal-planners/${mealPlanId}`; },
    path: 'meal-planners/:mealPlanId',
  },
  MessagesPage: {
    getPath() { return `/messages`; },
    path: 'messages',
  },
  MessageThreadPage: {
    getPath(otherUserId: string) { return `/messages/${otherUserId}`; },
    path: 'messages/:otherUserId',
  },
  EditRecipePage: {
    getPath(recipeId: string) { return `/edit-recipe/${recipeId}`; },
    path: 'edit-recipe/:recipeId',
  },
  RecipePage: {
    getPath(recipeId: string) { return `/recipe/${recipeId}`; },
    path: 'recipe/:recipeId',
  },
  SettingsPage: {
    getPath() { return `/settings`; },
    path: 'settings',
  },
  AccountPage: {
    getPath() { return `/settings/account`; },
    path: 'settings/account',
  },
  MyProfilePage: {
    getPath() { return `people/my-profile`; },
    path: 'people/my-profile',
  },
  ProfilePage: {
    getPath(username: string) { return `people/${username}`; },
    path: 'people/:username',
  },
  PeoplePage: {
    getPath() { return `people`; },
    path: 'people',
  },
  SocialPage: {
    getPath() { return `people`; },
    path: 'people',
  },
  ExportPage: {
    getPath() { return `/settings/export`; },
    path: 'settings/export',
  },
  ImportPage: {
    getPath() { return `/settings/import`; },
    path: 'settings/import',
  },
  ImportLivingcookbookPage: {
    getPath() { return `/settings/import/livingcookbook`; },
    path: 'settings/import/livingcookbook',
  },
  ImportPaprikaPage: {
    getPath() { return `/settings/import/paprika`; },
    path: 'settings/import/paprika',
  },
  ImportPepperplatePage: {
    getPath() { return `/settings/import/pepperplate`; },
    path: 'settings/import/pepperplate',
  },
  ShoppingListsPage: {
    getPath() { return `/shopping-lists`; },
    path: 'shopping-lists',
  },
  ShoppingListPage: {
    getPath(shoppingListId: string) { return `/shopping-lists/${shoppingListId}`; },
    path: 'shopping-lists/:shoppingListId',
  }
};

@Injectable({
  providedIn: 'root'
})
export class UtilService {

  lang = ((window.navigator as any).userLanguage || window.navigator.language);

  devBase: string = localStorage.getItem('base') || `${window.location.protocol}//${window.location.hostname}/api/`;

  standardMessages = {
    offlineFetchMessage: `It looks like you\'re offline.
                          While offline, we\'re only able to fetch data you\'ve previously accessed on this device.`,
    offlinePushMessage: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
    unexpectedError: 'An unexpected error occured. Please try again.',
    unauthorized: 'You are not authorized for this action! If you believe this is in error, please log out and log in using the side menu.'
  };

  constructor(public sanitizer: DomSanitizer) {}

  getBase(): string {
    return this.devBase;
  }

  removeToken() {
    localStorage.removeItem('token');
  }

  setToken(token) {
    localStorage.setItem('token', token);
  }

  getToken(): string {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getTokenQuery(): string {
    if (this.isLoggedIn()) return `?token=${this.getToken()}`;
    return `?false=false`;
  }

  generatePrintShoppingListURL(shoppingListId) {
    return `${this.getBase()}print/shoppingList/${shoppingListId}${this.getTokenQuery()}&version=${(window as any).version}&print=true`;
  }

  generateTrustedRecipeTemplateURL(recipeId: string, modifiers: RecipeTemplateModifiers): SafeResourceUrl {
    const url = this.generateRecipeTemplateURL(recipeId, modifiers);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  generateRecipeTemplateURL(recipeId: string, modifiers: RecipeTemplateModifiers): string {
    modifiers = { version: (window as any).version, ...modifiers };
    const modifierQuery = Object.keys(modifiers)
      .filter(modifierKey => modifiers[modifierKey])
      .map(modifierKey => `${modifierKey}=${modifiers[modifierKey]}`)
      .join('&');

    const url = `${this.getBase()}embed/recipe/${recipeId}?${modifierQuery}`;

    return url;
  }

  formatDate(date, options?: { now?: boolean, times?: boolean }): string {
    options = options || {};
    const aFewMomentsAgoAfter = new Date();
    aFewMomentsAgoAfter.setMinutes(aFewMomentsAgoAfter.getMinutes() - 2);

    const todayAfter = new Date();
    todayAfter.setHours(0);
    todayAfter.setMinutes(0);
    todayAfter.setSeconds(0);
    todayAfter.setMilliseconds(0);

    const thisWeekAfter = new Date();
    thisWeekAfter.setDate(thisWeekAfter.getDate() - 7);

    const toFormat = new Date(date);

    if (options.now && aFewMomentsAgoAfter < toFormat) {
      return 'just now';
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

  buildPublicRoutePath(hashlessRoutePath: string) {
    return `${window.location.origin}/#/${hashlessRoutePath}`;
  }
}
