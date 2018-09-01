import { Injectable } from '@angular/core';

@Injectable()
export class UtilServiceProvider {

  lang: any = ((<any>window.navigator).userLanguage || window.navigator.language);

  standardMessages: any = {
    offlineFetchMessage: 'It looks like you\'re offline. While offline, we\'re only able to fetch data you\'ve previously accessed on this device.',
    offlinePushMessage: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
    unexpectedError: 'An unexpected error occured. Please try again.',
    unauthorized: 'You are not authorized for this action! If you believe this is in error, please log out and log in using the side menu.'
  };

  constructor() {}

  formatDate(date, options?) {
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
