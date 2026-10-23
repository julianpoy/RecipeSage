import { decode } from "he";
import { sanitizeRemoveHtmlFromString } from "./sanitizeRemoveHtmlFromString";

export const sanitizeRemoveHtmlToPlainText = (input: string): string => {
  return decode(sanitizeRemoveHtmlFromString(input));
};
