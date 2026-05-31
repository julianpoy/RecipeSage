import type { IncomingHttpHeaders } from "http";
import acceptLanguage from "accept-language";
import { SupportedLanguages } from "@recipesage/util/shared";

acceptLanguage.languages(Object.values(SupportedLanguages));

const DEFAULT_LANGUAGE = "en-us";

export const getRequestLanguage = (req: {
  headers: IncomingHttpHeaders;
}): string => {
  const custom =
    req.headers["x-recipesage-language"] ||
    req.headers["X-RecipeSage-Language"];
  const customValue = Array.isArray(custom) ? custom[0] : custom;
  const raw = customValue || req.headers["accept-language"];
  return acceptLanguage.get(raw || DEFAULT_LANGUAGE) || DEFAULT_LANGUAGE;
};
