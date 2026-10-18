import { createRouter } from "@tanstack/react-router";
import type { TranslationKey } from "../i18n/TranslationKey";
import { routeTree } from "./routeTree";
import { searchParams } from "./searchParams";
import { navigation } from "./navigation";
import { RouteErrorPage } from "../pages/error-pages/RouteErrorPage";

const basepath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export const router = createRouter({
  routeTree,
  basepath,
  parseSearch: searchParams.parse,
  stringifySearch: searchParams.stringify,
  scrollRestoration: true,
  defaultPreload: "intent",
  defaultErrorComponent: RouteErrorPage,
});

navigation.setHrefNavigator((href, options) => {
  void router.navigate({ href, replace: options?.replace });
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }

  interface StaticDataRouteOption {
    titleKey?: TranslationKey;
    cookMode?: boolean;
  }

  interface HistoryState {
    showBack?: boolean;
    recipeIds?: string[];
  }
}
