import type { ActivatedRouteSnapshot, Params } from "@angular/router";

const NON_IDENTIFYING_PARAMS = ["authType", "folder"];

const SENTINEL_PARAM_VALUES = ["new"];

const resolveSegment = (segment: string, params: Params): string => {
  if (!segment.startsWith(":")) return segment;

  const name = segment.slice(1);
  const value: unknown = params[name];
  if (typeof value !== "string" || !value) return segment;

  if (NON_IDENTIFYING_PARAMS.includes(name)) return value;
  if (SENTINEL_PARAM_VALUES.includes(value)) return value;

  return segment;
};

export const getRoutePattern = (root: ActivatedRouteSnapshot): string => {
  const segments: string[] = [];

  let route: ActivatedRouteSnapshot | null = root;
  while (route) {
    const current: ActivatedRouteSnapshot = route;
    const path = current.routeConfig?.path;
    if (path) {
      segments.push(
        path
          .split("/")
          .map((segment) => resolveSegment(segment, current.params))
          .join("/"),
      );
    }
    route = current.firstChild;
  }

  return `/${segments.join("/")}`;
};
