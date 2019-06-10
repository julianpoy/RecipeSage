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
