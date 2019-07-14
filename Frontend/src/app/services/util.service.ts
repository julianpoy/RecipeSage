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
    loadChildren: '@/pages/home/home.module#HomePageModule'
  },
  AboutPage: {
    getPath: () => `about`,
    path: 'about',
    loadChildren: '@/pages/info-components/about/about.module#AboutPageModule'
  },
  AboutDetailsPage: {
    getPath: () => `about/details`,
    path: 'about/details',
    loadChildren: '@/pages/info-components/about-details/about-details.module#AboutDetailsPageModule'
  },
  LegalPage: {
    getPath: () => `legal`,
    path: 'legal',
    loadChildren: '@/pages/info-components/legal/legal.module#LegalPageModule'
  },
  ContributePage: {
    getPath: () => `contribute`,
    path: 'contribute',
    loadChildren: '@/pages/info-components/contribute/contribute.module#ContributePageModule'
  },
  ContributeCancelPage: {
    getPath: () => `contribute/cancel`,
    path: 'contribute/cancel',
    loadChildren: '@/pages/info-components/contribute-cancel/contribute-cancel.module#ContributeCancelPageModule'
  },
  ContributeThankYouPage: {
    getPath: () => `contribute/thankyou`,
    path: 'contribute/thankyou',
    loadChildren: '@/pages/info-components/contribute-thankyou/contribute-thankyou.module#ContributeThankYouPageModule'
  },
  ReleaseNotesPage: {
    getPath: () => `release-notes`,
    path: 'release-notes',
    loadChildren: '@/pages/info-components/release-notes/release-notes.module#ReleaseNotesPageModule'
  },
  TipsTricksTutorialsPage: {
    getPath: () => `tips-tricks-tutorials`,
    path: 'tips-tricks-tutorials',
    loadChildren: '@/pages/info-components/tips-tricks-tutorials/tips-tricks-tutorials.module#TipsTricksTutorialsPageModule'
  },
  WelcomePage: {
    getPath: () => `welcome`,
    path: 'welcome',
    loadChildren: '@/pages/info-components/welcome/welcome.module#WelcomePageModule'
  },
  LoginPage: {
    getPath: () => `login`,
    path: 'login',
    loadChildren: '@/pages/login/login.module#LoginPageModule'
  },
  MealPlansPage: {
    getPath: () => `meal-planners`,
    path: 'meal-planners',
    loadChildren: '@/pages/meal-plan-components/meal-plans/meal-plans.module#MealPlansPageModule'
  },
  MealPlanPage: {
    getPath: (mealPlanId: string) => `meal-planners/${mealPlanId}`,
    path: 'meal-planners/:mealPlanId',
    loadChildren: '@/pages/meal-plan-components/meal-plan/meal-plan.module#MealPlanPageModule'
  },
  MessagesPage: {
    getPath: () => `messages`,
    path: 'messages',
    loadChildren: '@/pages/messaging-components/messages/messages.module#MessagesPageModule'
  },
  MessageThreadPage: {
    getPath: (otherUserId: string) => `messages/${otherUserId}`,
    path: 'messages/:otherUserId',
    loadChildren: '@/pages/messaging-components/message-thread/message-thread.module#MessageThreadPageModule'
  },
  EditRecipePage: {
    getPath: (recipeId: string) => `edit-recipe/${recipeId}`,
    path: 'edit-recipe/:recipeId',
    loadChildren: '@/pages/recipe-components/edit-recipe/edit-recipe.module#EditRecipePageModule'
  },
  RecipePage: {
    getPath: (recipeId: string) => `recipe/${recipeId}`,
    path: 'recipe/:recipeId',
    loadChildren: '@/pages/recipe-components/recipe/recipe.module#RecipePageModule'
  },
  SettingsPage: {
    getPath: () => `settings`,
    path: 'settings',
    loadChildren: '@/pages/settings-components/settings/settings.module#SettingsPageModule'
  },
  AccountPage: {
    getPath: () => `settings/account`,
    path: 'settings/account',
    loadChildren: '@/pages/settings-components/account/account.module#AccountPageModule'
  },
  ExportPage: {
    getPath: () => `settings/export`,
    path: 'settings/export',
    loadChildren: '@/pages/settings-components/export/export.module#ExportPageModule'
  },
  ImportPage: {
    getPath: () => `settings/import`,
    path: 'settings/import',
    loadChildren: '@/pages/settings-components/import/import.module#ImportPageModule'
  },
  ImportLivingcookbookPage: {
    getPath: () => `settings/import/livingcookbook`,
    path: 'settings/import/livingcookbook',
    loadChildren: '@/pages/settings-components/import-livingcookbook/import-livingcookbook.module#ImportLivingcookbookPageModule'
  },
  ImportPaprikaPage: {
    getPath: () => `settings/import/paprika`,
    path: 'settings/import/paprika',
    loadChildren: '@/pages/settings-components/import-paprika/import-paprika.module#ImportPaprikaPageModule'
  },
  ImportPepperplatePage: {
    getPath: () => `settings/import/pepperplate`,
    path: 'settings/import/pepperplate',
    loadChildren: '@/pages/settings-components/import-pepperplate/import-pepperplate.module#ImportPepperplatePageModule'
  },
  ShoppingListsPage: {
    getPath: () => `shopping-lists`,
    path: 'shopping-lists',
    loadChildren: '@/pages/shopping-list-components/shopping-lists/shopping-lists.module#ShoppingListsPageModule'
  },
  ShoppingListPage: {
    getPath: (shoppingListId: string) => `shopping-lists/${shoppingListId}`,
    path: 'shopping-lists/:shoppingListId',
    loadChildren: '@/pages/shopping-list-components/shopping-list/shopping-list.module#ShoppingListPageModule'
  }
};

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
