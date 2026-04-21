import { Injectable, PLATFORM_ID, inject } from "@angular/core";
import { DOCUMENT, isPlatformBrowser } from "@angular/common";
import { TranslateService } from "@ngx-translate/core";
import {
  AppTheme,
  SupportedFontSize,
  SupportedLanguages,
} from "@recipesage/util/shared";
import { NavController } from "@ionic/angular/standalone";
import { getBase } from "../utils/getBase";
import { StorageService } from "./storage.service";

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
  print?: boolean; // Triggers immediate print
  scale?: number;
}

// TODO: Create more types for various page getPath methods
export enum AuthType {
  Login = "login",
  Register = "register",
}

export interface HomePageFilters {
  userId?: string;
  selectedLabels?: string[];
}

export const RouteMap = {
  HomePage: {
    getPath(folder: string, filters?: HomePageFilters) {
      let url = `/list/${folder}`;

      const params = [];
      if (filters?.userId) params.push(`userId=${filters.userId}`);
      if (filters?.selectedLabels) {
        params.push(
          `labels=${filters.selectedLabels
            .map((labelName) => encodeURIComponent(labelName))
            .join(",")}`,
        );
      }

      if (params.length > 0) url += `?${params.join("&")}`;

      return url;
    },
    path: "list/:folder",
  },
  LabelsPage: {
    getPath() {
      return `labels`;
    },
    path: "labels",
  },
  AboutPage: {
    getPath() {
      return `/about`;
    },
    path: "about",
  },
  AboutDetailsPage: {
    getPath() {
      return `/about/details`;
    },
    path: "about/details",
  },
  DownloadAndInstallPage: {
    getPath() {
      return `/install`;
    },
    path: "install",
  },
  ContactPage: {
    getPath() {
      return `/about/contact`;
    },
    path: "about/contact",
  },
  LegalPage: {
    getPath() {
      return `/legal`;
    },
    path: "legal",
  },
  ContributePage: {
    getPath() {
      return `/contribute`;
    },
    path: "contribute",
  },
  ContributeCancelPage: {
    getPath() {
      return `/contribute/cancel`;
    },
    path: "contribute/cancel",
  },
  ContributeThankYouPage: {
    getPath() {
      return `/contribute/thankyou`;
    },
    path: "contribute/thankyou",
  },
  WelcomePage: {
    getPath() {
      return `/welcome`;
    },
    path: "welcome",
  },
  AuthPage: {
    getPath(authType: AuthType) {
      return `/auth/${authType}`;
    },
    path: "auth/:authType",
  },
  MealPlansPage: {
    getPath() {
      return `/meal-planners`;
    },
    path: "meal-planners",
  },
  MealPlanPage: {
    getPath(mealPlanId: string) {
      return `/meal-planners/${mealPlanId}`;
    },
    path: "meal-planners/:mealPlanId",
  },
  AssistantPage: {
    getPath() {
      return `/assistant`;
    },
    path: "assistant",
  },
  MessagesPage: {
    getPath() {
      return `/messages`;
    },
    path: "messages",
  },
  MessageThreadPage: {
    getPath(otherUserId: string) {
      return `/messages/${otherUserId}`;
    },
    path: "messages/:otherUserId",
  },
  EditRecipePage: {
    getPath(recipeId: string) {
      return `/edit-recipe/${recipeId}`;
    },
    path: "edit-recipe/:recipeId",
  },
  RecipePage: {
    getPath(recipeId: string) {
      return `/recipe/${recipeId}`;
    },
    path: "recipe/:recipeId",
  },
  SettingsPage: {
    getPath() {
      return `/settings`;
    },
    path: "settings",
  },
  AccountPage: {
    getPath() {
      return `/settings/account`;
    },
    path: "settings/account",
  },
  MyProfilePage: {
    getPath() {
      return `people/my-profile`;
    },
    path: "people/my-profile",
  },
  ProfilePage: {
    getPath(handle: string) {
      return `people/${handle}`;
    },
    path: "people/:handle",
  },
  PeoplePage: {
    getPath() {
      return `people`;
    },
    path: "people",
  },
  ExportPage: {
    getPath() {
      return `/settings/export`;
    },
    path: "settings/export",
  },
  ImportPage: {
    getPath() {
      return `/settings/import`;
    },
    path: "settings/import",
  },
  ImportLivingcookbookPage: {
    getPath() {
      return `/settings/import/livingcookbook`;
    },
    path: "settings/import/livingcookbook",
  },
  ImportPaprikaPage: {
    getPath() {
      return `/settings/import/paprika`;
    },
    path: "settings/import/paprika",
  },
  ImportJSONLDPage: {
    getPath() {
      return `/settings/import/json-ld`;
    },
    path: "settings/import/json-ld",
  },
  ImportCookmatePage: {
    getPath() {
      return `/settings/import/cookmate`;
    },
    path: "settings/import/cookmate",
  },
  ImportCopymethatPage: {
    getPath() {
      return `/settings/import/copymethat`;
    },
    path: "settings/import/copymethat",
  },
  ImportRecipeKeeperPage: {
    getPath() {
      return `/settings/import/recipe-keeper`;
    },
    path: "settings/import/recipe-keeper",
  },
  ImportPepperplatePage: {
    getPath() {
      return `/settings/import/pepperplate`;
    },
    path: "settings/import/pepperplate",
  },
  ImportTextfilesPage: {
    getPath() {
      return `/settings/import/textfiles`;
    },
    path: "settings/import/textfiles",
  },
  ImportEnexPage: {
    getPath() {
      return `/settings/import/enex`;
    },
    path: "settings/import/enex",
  },
  ImportUrlsPage: {
    getPath() {
      return `/settings/import/urls`;
    },
    path: "settings/import/urls",
  },
  ImportCSVPage: {
    getPath() {
      return `/settings/import/csv`;
    },
    path: "settings/import/csv",
  },
  ImportPDFsPage: {
    getPath() {
      return `/settings/import/pdfs`;
    },
    path: "settings/import/pdfs",
  },
  ImportImagesPage: {
    getPath() {
      return `/settings/import/images`;
    },
    path: "settings/import/images",
  },
  ShoppingListsPage: {
    getPath() {
      return `/shopping-lists`;
    },
    path: "shopping-lists",
  },
  ShoppingListPage: {
    getPath(shoppingListId: string) {
      return `/shopping-lists/${shoppingListId}`;
    },
    path: "shopping-lists/:shoppingListId",
  },
};

// This can be used for fallback when a non-localized language is requested
// and we only have localized versions
const defaultLocality = {
  en: SupportedLanguages.EN_US,
  it: SupportedLanguages.IT_IT,
  de: SupportedLanguages.DE_DE,
  uk: SupportedLanguages.UK_UA,
  he: SupportedLanguages.HE,
  es: SupportedLanguages.ES_ES,
  fr: SupportedLanguages.FR_FR,
  ru: SupportedLanguages.RU_RU,
  hu: SupportedLanguages.HU_HU,
  da: SupportedLanguages.DA_DK,
  zh: SupportedLanguages.ZH_CN,
  pt: SupportedLanguages.PT_PT,
  nl: SupportedLanguages.NL,
  pl: SupportedLanguages.PL,
  ja: SupportedLanguages.JA,
  lt: SupportedLanguages.LT,
  eu: SupportedLanguages.EU,
  el: SupportedLanguages.EL,
  fi: SupportedLanguages.FI,
  sv: SupportedLanguages.SV,
  ro: SupportedLanguages.RO,
  cs: SupportedLanguages.CS,
};

const rtlLanguages = [SupportedLanguages.HE];

@Injectable({
  providedIn: "root",
})
export class UtilService {
  private translate = inject(TranslateService);
  private storage = inject(StorageService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private document = inject(DOCUMENT, { optional: true });

  memoizedFormattedDates: Map<string, string> = new Map();

  constructor() {
    if (this.isBrowser) {
      setInterval(
        () => {
          this.memoizedFormattedDates.clear();
        },
        1000 * 60 * 5,
      );
    }
  }

  getAppBrowserLang(): string {
    const isSupported = (
      lang: string | undefined,
    ): lang is SupportedLanguages => {
      return Object.values(SupportedLanguages).some((el) => el === lang);
    };

    const resolve = (lang: string): string | null => {
      const lower = lang.toLowerCase();
      const noRegion = lower.split("-")[0];
      const defaultLocalized =
        noRegion in defaultLocality
          ? defaultLocality[noRegion as keyof typeof defaultLocality]
          : undefined;

      if (isSupported(lower)) return lower;
      if (isSupported(noRegion)) return noRegion;
      if (isSupported(defaultLocalized)) return defaultLocalized;
      return null;
    };

    if (!this.isBrowser) return SupportedLanguages.EN_US;

    return resolve(window.navigator.language) || SupportedLanguages.EN_US;
  }

  setHtmlBrowserLang(lang: string) {
    const doc = this.document;
    if (!doc) return;
    doc.documentElement.lang = lang;
    if (rtlLanguages.includes(lang as SupportedLanguages)) {
      doc.documentElement.dir = "rtl";
    } else {
      doc.documentElement.dir = "ltr";
    }
  }

  getBase() {
    return getBase();
  }

  setFontSize(fontSize: SupportedFontSize) {
    if (!this.isBrowser) return;
    window.document.documentElement.style.fontSize = fontSize;
  }

  setAppTheme(theme: AppTheme) {
    if (!this.isBrowser) return;
    const bodyClasses = document.body.className.replace(/theme-\S*/, "");
    document.body.className = `${bodyClasses} theme-${theme}`;
  }

  getToken(): string | null {
    return this.storage.getItem("token");
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getTokenQuery(): string {
    if (this.isLoggedIn()) return `?token=${this.getToken()}`;
    return `?false=false`;
  }

  generatePrintShoppingListURL(
    shoppingListId: string,
    options: {
      groupSimilar: boolean;
      groupCategories: boolean;
      sortBy?: string;
      preferredLanguage?: string;
    },
  ) {
    let query = `${this.getTokenQuery()}&version=${APP_VERSION}&print=true`;

    if (options.groupSimilar) query += "&groupSimilar=true";
    if (options.groupCategories) query += "&groupCategories=true";
    if (options.preferredLanguage)
      query += `&preferredLanguage=${options.preferredLanguage}`;
    if (options.sortBy) query += `&sortBy=${options.sortBy}`;

    return `${this.getBase()}print/shoppingList/${shoppingListId}${query}`;
  }

  generatePrintMealPlanURL(
    mealPlanId: string,
    options: {
      viewType: string;
      calendarMonth?: number;
      calendarYear?: number;
      startOfWeek?: string;
      preferredLanguage?: string;
    },
  ) {
    let query = `${this.getTokenQuery()}&version=${APP_VERSION}&print=true`;

    query += `&viewType=${options.viewType}`;
    if (options.calendarMonth !== undefined)
      query += `&calendarMonth=${options.calendarMonth}`;
    if (options.calendarYear !== undefined)
      query += `&calendarYear=${options.calendarYear}`;
    if (options.startOfWeek) query += `&startOfWeek=${options.startOfWeek}`;
    if (options.preferredLanguage)
      query += `&preferredLanguage=${options.preferredLanguage}`;

    return `${this.getBase()}print/mealPlan/${mealPlanId}${query}`;
  }

  generateRecipeTemplateURL(
    recipeId: string,
    modifiers: RecipeTemplateModifiers,
  ): string {
    modifiers = { version: APP_VERSION, ...modifiers };
    const modifierQuery = Object.entries(modifiers)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const url = `${this.getBase()}print/recipe/${recipeId}?${modifierQuery}`;

    return url;
  }

  formatDate(
    date: string | number | Date,
    options: { now?: boolean; times?: boolean } = {},
  ): string {
    const memoKey = date.toString() + options.now + options.times;
    const memoizedValue = this.memoizedFormattedDates.get(memoKey);
    if (memoizedValue) return memoizedValue;

    const calculatedValue = this._formatDate(date, options);

    this.memoizedFormattedDates.set(memoKey, calculatedValue);
    return calculatedValue;
  }

  private _formatDate(
    date: string | number | Date,
    options: { now?: boolean; times?: boolean } = {},
  ): string {
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
      const justNow = this.translate.instant("services.util.justNow");
      if (justNow) return justNow;
    }

    if (!options.times && todayAfter < toFormat) {
      const today = this.translate.instant("services.util.today");
      if (today) return today;
    }

    const locale = this.browserLocale();

    if (options.times && todayAfter < toFormat) {
      return toFormat.toLocaleString(locale, {
        hour: "numeric",
        minute: "numeric",
      });
    }

    if (options.times && thisWeekAfter < toFormat) {
      return toFormat.toLocaleString(locale, {
        weekday: "long",
        hour: "numeric",
        minute: "numeric",
      });
    }

    if (!options.times && thisWeekAfter < toFormat) {
      return toFormat.toLocaleString(locale, {
        weekday: "long",
      });
    }

    if (!options.times) {
      return toFormat.toLocaleString(locale, {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      });
    } else {
      return toFormat.toLocaleString(locale, {
        hour: "numeric",
        minute: "numeric",
        month: "numeric",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  private browserLocale(): string {
    if (!this.isBrowser) return "en-us";
    return window.navigator.language;
  }

  buildPublicRoutePath(hashlessRoutePath: string) {
    const path = hashlessRoutePath.startsWith("/")
      ? hashlessRoutePath
      : `/${hashlessRoutePath}`;
    return `${window.location.origin}${path}`;
  }

  truncate(str: String, maxLength: number) {
    const ellipsis = "...";
    const trueMaxLength = maxLength - ellipsis.length;

    if (str.length <= trueMaxLength) return str;
    return `${str.substring(0, trueMaxLength)}${ellipsis}`;
  }

  openRecipe(
    navCtrl: NavController,
    recipeId: string,
    event?: MouseEvent | KeyboardEvent,
  ) {
    if (event && (event.metaKey || event.ctrlKey)) {
      window.open(RouteMap.RecipePage.getPath(recipeId));
      return;
    }
    navCtrl.navigateForward(RouteMap.RecipePage.getPath(recipeId));
  }
}
