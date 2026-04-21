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
