const ISO8601_TIME =
  /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

type LocalizedTimeUnit = "day" | "hour" | "minute" | "second";

const formatLocalizedTime = (
  units: [number, LocalizedTimeUnit][],
  locale: string,
): string => {
  const parts = units.map(([value, unit]) =>
    new Intl.NumberFormat(locale, {
      style: "unit",
      unit,
      unitDisplay: "long",
    }).format(value),
  );

  return new Intl.ListFormat(locale, { style: "narrow", type: "unit" }).format(
    parts,
  );
};

export const convertFromISO8601Time = (time: string, locale = "en") => {
  const match = time.match(ISO8601_TIME);
  if (!match) return time;

  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);

  const units: [number, LocalizedTimeUnit][] = [];
  if (days) units.push([days, "day"]);
  if (hours) units.push([hours, "hour"]);
  if (minutes) units.push([minutes, "minute"]);
  if (seconds) units.push([seconds, "second"]);
  if (units.length === 0) return "";

  try {
    return formatLocalizedTime(units, locale);
  } catch {
    return formatLocalizedTime(units, "en");
  }
};
