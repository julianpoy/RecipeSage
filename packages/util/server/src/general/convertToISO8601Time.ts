export const convertFromISO8601Time = (time: string) => {
  if (!time.startsWith("PT")) return time;

  return time
    .replace("PT", "")
    .replace("H", " Hour(s) ")
    .replace("M", " Minute(s) ")
    .replace("S", " Seconds(s) ");
};
