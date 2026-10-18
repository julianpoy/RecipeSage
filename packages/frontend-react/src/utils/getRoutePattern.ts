const NON_IDENTIFYING_PARAMS = ["authType", "folder"];

const SENTINEL_PARAM_VALUES = ["new"];

const resolveSegment = (
  segment: string,
  params: Record<string, string>,
): string => {
  if (!segment.startsWith("$")) return segment;

  const name = segment.slice(1);
  const value = params[name];
  if (!value) return `:${name}`;

  if (NON_IDENTIFYING_PARAMS.includes(name)) return value;
  if (SENTINEL_PARAM_VALUES.includes(value)) return value;

  return `:${name}`;
};

export const getRoutePattern = (
  fullPath: string,
  params: Record<string, string>,
): string => {
  const segments = fullPath
    .split("/")
    .filter((segment) => segment)
    .map((segment) => resolveSegment(segment, params));

  return `/${segments.join("/")}`;
};
