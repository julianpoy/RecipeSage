export const convertToISO8601Time = (time: string) => {
  let timeString = "";

  const hourMatch = time.match(/(\d* ?(\d+\/\d+)?(\.\d+)?) *(hours?|hr?s?)/i);
  if (hourMatch) timeString += `${hourMatch[1].trim()}H`;

  const minuteMatch = time.match(
    /(\d* ?(\d+\/\d+)?(\.\d+)?) *(minutes?|mins?|m)/i,
  );
  if (minuteMatch) timeString += `${minuteMatch[1].trim()}M`;

  if (timeString) return `PT${timeString}`;

  return "";
};
