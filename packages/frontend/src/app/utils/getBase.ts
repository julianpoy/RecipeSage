import { API_BASE_URL } from "../../environments/environment";
import { getApiHostOverride } from "./apiHostOverride";

export const getBase = (): string => {
  let windowRef = self || window;

  const override = getApiHostOverride();
  if (override) {
    const overrideBase = override.endsWith("/") ? override : `${override}/`;
    return `${overrideBase}api/`;
  }

  if (windowRef.location.hostname === "beta.recipesage.com")
    return "https://api.beta.recipesage.com/";
  if ((API_BASE_URL as string) === "https://api.recipesage.com/")
    return API_BASE_URL;

  const subpathBase = `${windowRef.location.protocol}//${windowRef.location.hostname}/api/`;
  const base = API_BASE_URL || subpathBase;

  if (typeof window === "undefined") {
    return base;
  }

  const baseElement = document.querySelector("base");
  const baseHref = baseElement ? baseElement.href : document.location.href;
  const url = new URL(base, baseHref);

  return url.href;
};
