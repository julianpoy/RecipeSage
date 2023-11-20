// Returns map of query params to their given value
// Ignores hashmap routing because Ionic router
// (/?test=asdf/#/... is converted to /#/?test=asdf by index.html before Ionic router loads
export const getQueryParams = () => {
  const queryString = window.location.href.split("?")[1] || "";

  return Object.fromEntries(
    queryString
      .split("&")
      .map((el) => el.split("="))
      .map(([key, val]) => [decodeURIComponent(key), decodeURIComponent(val)]),
  );
};

export const getQueryParam = (paramName: string): string | undefined => {
  return getQueryParams()[paramName];
};
