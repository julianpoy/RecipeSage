const ISO8601_TIME =
  /^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/;

const formatLocalizedTime = (
  units: [number, "hour" | "minute" | "second"][],
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

  const units: [number, "hour" | "minute" | "second"][] = [];
  if (match[1]) units.push([Number(match[1]), "hour"]);
  if (match[2]) units.push([Number(match[2]), "minute"]);
  if (match[3]) units.push([Number(match[3]), "second"]);
  if (units.length === 0) return "";

  try {
    return formatLocalizedTime(units, locale);
  } catch {
    return formatLocalizedTime(units, "en");
  }
};
