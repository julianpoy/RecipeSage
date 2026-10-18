import {
  quickTutorialService,
  QuickTutorialOptions,
} from "./quickTutorialService";

const printableRouteMatchers = [
  /^\/recipe\/[^/]+(?:[/?#]|$)/,
  /^\/shopping-lists\/[^/]+(?:[/?#]|$)/,
  /^\/meal-planners\/[^/]+(?:[/?#]|$)/,
];

const getAppPath = () => {
  const basepath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const pathname = window.location.pathname;
  return pathname.startsWith(basepath)
    ? pathname.slice(basepath.length)
    : pathname;
};

export const nativePrintTutorialService = {
  init() {
    window.addEventListener("afterprint", () => {
      const path = getAppPath();
      const isPrintablePage = printableRouteMatchers.some((matcher) =>
        matcher.test(path),
      );
      if (!isPrintablePage) return;

      void quickTutorialService.triggerQuickTutorial(
        QuickTutorialOptions.NativePrintView,
      );
    });
  },
};
