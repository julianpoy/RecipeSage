import { Injectable } from '@angular/core';

@Injectable()
export class UtilServiceProvider {

  lang: any = ((<any>window.navigator).userLanguage || window.navigator.language);

  constructor() {}

  formatDate(date, options?) {
    options = options || {};
    var aFewMomentsAgoAfter = new Date();
    aFewMomentsAgoAfter.setMinutes(aFewMomentsAgoAfter.getMinutes() - 5);

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

    if (!options.times && options.todayAfter < toFormat) {
      return 'today';
    }

    if (options.times && options.todayAfter < toFormat) {
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
