import { RenderMode, ServerRoute } from "@angular/ssr";
import { AuthType } from "./services/util.service";
import { SUPPORTED_LOCALES } from "./services/locale.service";

export const serverRoutes: ServerRoute[] = [
  { path: "", renderMode: RenderMode.Prerender },
  { path: "welcome", renderMode: RenderMode.Prerender },
  { path: "about", renderMode: RenderMode.Prerender },
  { path: "about/details", renderMode: RenderMode.Prerender },
  { path: "about/contact", renderMode: RenderMode.Prerender },
  { path: "install", renderMode: RenderMode.Prerender },
  {
    path: "auth/:authType",
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      Object.values(AuthType).map((authType) => ({ authType })),
  },
  { path: "recipe/:recipeId", renderMode: RenderMode.Server },

  {
    path: ":locale",
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      SUPPORTED_LOCALES.map((locale) => ({ locale })),
  },
  {
    path: ":locale/welcome",
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      SUPPORTED_LOCALES.map((locale) => ({ locale })),
  },
  {
    path: ":locale/about",
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      SUPPORTED_LOCALES.map((locale) => ({ locale })),
  },
  {
    path: ":locale/about/details",
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      SUPPORTED_LOCALES.map((locale) => ({ locale })),
  },
  {
    path: ":locale/about/contact",
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      SUPPORTED_LOCALES.map((locale) => ({ locale })),
  },
  {
    path: ":locale/install",
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      SUPPORTED_LOCALES.map((locale) => ({ locale })),
  },
  {
    path: ":locale/auth/:authType",
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => {
      const combos: Record<string, string>[] = [];
      for (const locale of SUPPORTED_LOCALES) {
        for (const authType of Object.values(AuthType)) {
          combos.push({ locale, authType });
        }
      }
      return combos;
    },
  },
  { path: ":locale/recipe/:recipeId", renderMode: RenderMode.Server },

  { path: "**", renderMode: RenderMode.Client },
];
