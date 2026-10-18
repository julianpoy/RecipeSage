import dayjs from "dayjs";
import { SupportedLanguages } from "@recipesage/util/shared";
import { i18n } from "../i18n/i18n";

const memoizedFormattedDates = new Map<string, string>();

setInterval(() => {
  memoizedFormattedDates.clear();
}, 1000 * 60);

export const getCurrentLocale = (): string =>
  i18n.language || SupportedLanguages.EN_US;

export const formatMonthName = (date: Date): string =>
  date.toLocaleString(getCurrentLocale(), { month: "long" });

export const formatMonthYear = (date: Date): string =>
  date.toLocaleDateString(getCurrentLocale(), {
    month: "long",
    year: "numeric",
  });

const calculateFormattedDate = (
  date: string | number | Date,
  options: { now?: boolean; times?: boolean },
): string => {
  const aFewMomentsAgoAfter = new Date();
  aFewMomentsAgoAfter.setMinutes(aFewMomentsAgoAfter.getMinutes() - 2);

  const todayAfter = new Date();
  todayAfter.setHours(0);
  todayAfter.setMinutes(0);
  todayAfter.setSeconds(0);
  todayAfter.setMilliseconds(0);

  const todayBefore = new Date(todayAfter);
  todayBefore.setDate(todayBefore.getDate() + 1);

  const thisWeekAfter = new Date();
  thisWeekAfter.setDate(thisWeekAfter.getDate() - 7);

  const toFormat = dayjs(date).toDate();
  const locale = getCurrentLocale();

  if (options.now && aFewMomentsAgoAfter < toFormat) {
    const justNow = i18n.t("services.util.justNow");
    if (justNow) return justNow;
  }

  const isToday = todayAfter <= toFormat && toFormat < todayBefore;

  if (!options.times && isToday) {
    const today = i18n.t("services.util.today");
    if (today) return today;
  }

  if (options.times && isToday) {
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
  }

  return toFormat.toLocaleString(locale, {
    hour: "numeric",
    minute: "numeric",
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
};

export const formatDate = (
  date: string | number | Date,
  options: { now?: boolean; times?: boolean } = {},
): string => {
  const memoKey =
    getCurrentLocale() + date.toString() + options.now + options.times;
  const memoizedValue = memoizedFormattedDates.get(memoKey);
  if (memoizedValue) return memoizedValue;

  const calculatedValue = calculateFormattedDate(date, options);

  memoizedFormattedDates.set(memoKey, calculatedValue);
  return calculatedValue;
};
