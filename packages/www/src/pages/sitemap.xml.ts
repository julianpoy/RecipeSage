import type { APIRoute } from "astro";
import { competitorSlugs } from "../data/competitors";
import {
  DEFAULT_LOCALE,
  WWW_SUPPORTED_LOCALES,
  toBcp47,
} from "../i18n/translations";

const LOCALIZED_PAGES = ["/", "/about", "/pricing", "/download"];

const EN_ONLY_PAGES = [
  "/alternatives",
  ...competitorSlugs.map((slug) => `/alternatives/${slug}`),
];

const priorityFor = (path: string, loc: string) => {
  const base = path === "/" ? 1.0 : 0.8;
  const adjusted = loc === DEFAULT_LOCALE ? base : base - 0.1;
  return adjusted.toFixed(1);
};

const urlForLocale = (site: URL, loc: string, path: string) => {
  const prefix = loc === DEFAULT_LOCALE ? "" : `/${loc}`;
  const full = path === "/" ? `${prefix}/` : `${prefix}${path}`;
  return new URL(full, site).toString();
};

const urlForEnOnly = (site: URL, path: string) =>
  new URL(path === "/" ? "/" : path, site).toString();

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error("astro.config.mjs `site` must be set");

  const lastmod = new Date().toISOString().split("T")[0];

  const urls: string[] = [];
  for (const path of LOCALIZED_PAGES) {
    const alternates = [
      ...WWW_SUPPORTED_LOCALES.map(
        (loc) =>
          `    <xhtml:link rel="alternate" hreflang="${toBcp47(loc)}" href="${urlForLocale(site, loc, path)}" />`,
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlForLocale(site, DEFAULT_LOCALE, path)}" />`,
    ].join("\n");

    for (const loc of WWW_SUPPORTED_LOCALES) {
      urls.push(
        [
          "  <url>",
          `    <loc>${urlForLocale(site, loc, path)}</loc>`,
          `    <lastmod>${lastmod}</lastmod>`,
          `    <changefreq>weekly</changefreq>`,
          `    <priority>${priorityFor(path, loc)}</priority>`,
          alternates,
          "  </url>",
        ].join("\n"),
      );
    }
  }

  for (const path of EN_ONLY_PAGES) {
    const enUrl = urlForEnOnly(site, path);
    const alternates = [
      `    <xhtml:link rel="alternate" hreflang="${toBcp47(DEFAULT_LOCALE)}" href="${enUrl}" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${enUrl}" />`,
    ].join("\n");

    urls.push(
      [
        "  <url>",
        `    <loc>${enUrl}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>monthly</changefreq>`,
        `    <priority>0.7</priority>`,
        alternates,
        "  </url>",
      ].join("\n"),
    );
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${urls.join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
};
