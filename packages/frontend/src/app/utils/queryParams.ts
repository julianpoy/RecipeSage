// Returns map of query params to their given value
export const getQueryParams = (): Record<string, string> => {
  return Object.fromEntries(new URLSearchParams(window.location.search));
};

export const getQueryParam = (paramName: string): string | undefined => {
  return (
    new URLSearchParams(window.location.search).get(paramName) ?? undefined
  );
};
