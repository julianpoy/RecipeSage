import { SupportedLanguages } from "@recipesage/util/shared";

const SUPPORTED_LOCALES = Object.values(SupportedLanguages);

const PRERENDERED_PATHS = [
  "/",
  "/welcome",
  "/about",
  "/about/details",
  "/about/contact",
  "/install",
  "/auth/login",
  "/auth/register",
];

function buildUrl(origin: string, locale: string | null, path: string): string {
  const trailing = path === "/" ? "" : path;
  if (!locale) {
    return origin + (trailing || "/");
  }
  return origin + "/" + locale + trailing;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSitemap(origin: string): string {
  const entries: string[] = [];

  for (const path of PRERENDERED_PATHS) {
    for (const locale of [null, ...SUPPORTED_LOCALES]) {
      const loc = buildUrl(origin, locale, path);
      const alternates: string[] = [];
      for (const altLocale of SUPPORTED_LOCALES) {
        alternates.push(
          `    <xhtml:link rel="alternate" hreflang="${altLocale}" href="${xmlEscape(buildUrl(origin, altLocale, path))}" />`,
        );
      }
      alternates.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(buildUrl(origin, null, path))}" />`,
      );
      entries.push(
        `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n${alternates.join("\n")}\n  </url>`,
      );
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join("\n")}\n</urlset>\n`;
}

export function buildRobots(origin: string): string {
  return `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`;
}
