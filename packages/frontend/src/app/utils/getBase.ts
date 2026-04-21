import { API_BASE_URL } from "../../environments/environment";

export const getBase = (): string => {
  if (typeof window === "undefined") {
    const ssrBase =
      typeof process !== "undefined"
        ? process.env?.["SSR_API_BASE_URL"]
        : undefined;
    return ssrBase || API_BASE_URL || "/api/";
  }

  const windowRef = window;
  if (windowRef.location.hostname === "beta.recipesage.com")
    return "https://api.beta.recipesage.com/";
  if ((API_BASE_URL as string) === "https://api.recipesage.com/")
    return API_BASE_URL;

  const subpathBase = `${windowRef.location.protocol}//${windowRef.location.hostname}/api/`;
  const base =
    (windowRef as any).API_BASE_OVERRIDE || API_BASE_URL || subpathBase;

  const baseElement = document.querySelector("base");
  const baseHref = baseElement ? baseElement.href : document.location.href;
  const url = new URL(base, baseHref);

  return url.href;
};
