import { API_BASE_URL } from "../../environments/environment";

export const getBase = (): string => {
  let windowRef = self || window;
  if (windowRef.location.hostname === "beta.recipesage.com")
    return "https://api.beta.recipesage.com/";

  const subpathBase = `${windowRef.location.protocol}//${windowRef.location.hostname}/api/`;

  return (windowRef as any).API_BASE_OVERRIDE || API_BASE_URL || subpathBase;
};
