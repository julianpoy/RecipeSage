const QUANTITY = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?`;

const HOUR_MATCHER = new RegExp(
  `(${QUANTITY}) *(?:hours?|hrs?|h)(?![a-z])`,
  "i",
);
const MINUTE_MATCHER = new RegExp(
  `(${QUANTITY}) *(?:minutes?|mins?|m)(?![a-z])`,
  "i",
);

const parseQuantity = (value: string): number | null => {
  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    if (denominator === 0) return null;
    return Number(mixed[1]) + Number(mixed[2]) / denominator;
  }

  const fraction = value.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }

  const decimal = Number(value);
  return Number.isFinite(decimal) ? decimal : null;
};

const formatQuantity = (value: number) =>
  Number.isInteger(value) ? `${value}` : `${Number(value.toFixed(4))}`;

const matchQuantity = (time: string, matcher: RegExp): number | null => {
  const match = time.match(matcher);
  if (!match) return null;
  return parseQuantity(match[1].trim());
};

export const convertToISO8601Time = (time: string) => {
  let timeString = "";

  const hours = matchQuantity(time, HOUR_MATCHER);
  if (hours !== null) timeString += `${formatQuantity(hours)}H`;

  const minutes = matchQuantity(time, MINUTE_MATCHER);
  if (minutes !== null) timeString += `${formatQuantity(minutes)}M`;

  if (timeString) return `PT${timeString}`;

  return "";
};
