const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

export const formatDateUTCLocalized = (
  dateStr: string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.toLocaleDateString(locale, {
    ...DEFAULT_OPTIONS,
    ...options,
    timeZone: "UTC",
  });
};
