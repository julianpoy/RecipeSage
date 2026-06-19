export const decodeBasicHtmlEntities = (input: string): string => {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
};
