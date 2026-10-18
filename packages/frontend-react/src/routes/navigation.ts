type HrefNavigator = (href: string, options?: { replace?: boolean }) => void;

let hrefNavigator: HrefNavigator = (href, options) => {
  if (options?.replace) window.location.replace(`/app${href}`);
  else window.location.assign(`/app${href}`);
};

export const navigation = {
  setHrefNavigator(navigator: HrefNavigator) {
    hrefNavigator = navigator;
  },

  navigateToHref(href: string, options?: { replace?: boolean }) {
    hrefNavigator(href, options);
  },
};
