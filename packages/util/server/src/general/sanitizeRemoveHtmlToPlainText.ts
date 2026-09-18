import he from "he";
import { sanitizeRemoveHtmlFromString } from "./sanitizeRemoveHtmlFromString";

export const sanitizeRemoveHtmlToPlainText = (input: string): string => {
  return he.decode(sanitizeRemoveHtmlFromString(input));
};
