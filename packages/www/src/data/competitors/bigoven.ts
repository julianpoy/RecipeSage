import type { CompetitorData } from "./types";

export const bigoven: CompetitorData = {
  slug: "bigoven",
  name: "BigOven",
  url: "https://www.bigoven.com/",
  tagline: "The free, open source BigOven alternative",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. It runs in any browser, on iOS, on Android, and as native desktop apps for Windows, macOS, and Linux, with no ads and no recipe cap.",
  seoDescription:
    "A BigOven alternative with no ads and no 200-recipe cap. RecipeSage is free and open source, with instant photo and PDF recipe import. Always free.",
  cardSummary:
    "A million-recipe community catalog wrapped in a free tier that shows ads and caps at 200 saved recipes.",
  intro: [
    "BigOven hosts a public catalog of over a million recipes with ratings and reviews. As a personal recipe keeper, the free tier caps at 200 saved recipes, shows ads (including video pop-ups and ads on printed recipes), and gates custom folders, advanced search, ingredient-level nutrition, and multi-account planner sharing behind BigOven Pro ($2.99 per month or $24.99 per year). BigOven's free tier also includes only 3 \"RecipeScan\" credits.",
    "My wife and I made RecipeSage as a free, open source personal recipe keeper with no ads and no cap. Photo and PDF import are instant, not human-assisted. You can export everything in standard formats anytime if you decide to leave.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever, unlimited recipes, no ads, no tracking. Open source under the AGPL.",
    competitor:
      "Free up to 200 recipes with ads. BigOven Pro is $2.99/month or $24.99/year. BigOven's RecipeScan credit packs cost $9.99 to $59.99.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "Free up to 200 recipes with ads, $24.99/year for Pro",
    },
    {
      feature: "Completely ad-free",
      recipesage: true,
      competitor: false,
      note: "BigOven shows video pop-ups and ads on printed recipes.",
    },
    {
      feature: "Unlimited saved recipes",
      recipesage: true,
      competitor: false,
      note: "BigOven caps free-tier at 200 recipes.",
    },
    {
      feature: "Custom folders / labels on the free tier",
      recipesage: true,
      competitor: false,
      note: "BigOven gates custom folders behind Pro.",
    },
    {
      feature: "Advanced search on the free tier",
      recipesage: true,
      competitor: false,
    },
    { feature: "Web app", recipesage: true, competitor: true },
    { feature: "iOS app", recipesage: true, competitor: true },
    { feature: "Android app", recipesage: true, competitor: true },
    {
      feature: "Auto import from a URL",
      recipesage: true,
      competitor: true,
      note: "RecipeSage's URL importer supports a wider range of recipe sites.",
    },
    {
      feature: "Instant photo import (OCR)",
      recipesage: true,
      competitor: "partial",
      note: "BigOven's RecipeScan is human-assisted and takes 2-5 days. The free tier includes 3 credits.",
    },
    {
      feature: "Import from PDF and Word documents",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Real Firefox and Chrome extension",
      recipesage: true,
      competitor: false,
      note: "BigOven offers a less-capable bookmarklet, not a real extension.",
    },
    {
      feature: "Data portability",
      recipesage: true,
      competitor: false,
      note: "BigOven's cloud product has no bulk export. RecipeSage supports well-recognized standardized formats.",
    },
    {
      feature: "Drag-and-drop meal planner",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Recurring meal plan items",
      recipesage: true,
      competitor: "partial",
    },
    {
      feature: "Smart shopping list",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Multi-account sharing",
      recipesage: true,
      competitor: "partial",
      note: "Multi-account sharing requires BigOven Pro.",
    },
    {
      feature: "Ingredient-level nutrition tracking",
      recipesage: true,
      competitor: "partial",
      note: "Ingredient-by-ingredient Nutrition Insight requires Pro.",
    },
    {
      feature: "Typo-tolerant search",
      recipesage: true,
      competitor: "partial",
    },
    {
      feature: "Works offline",
      recipesage: true,
      competitor: "partial",
    },
    {
      feature: "Open source",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Self-hostable",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Native desktop app (Windows, macOS, Linux)",
      recipesage: true,
      competitor: "partial",
      note: "BigOven has a native Windows app, while Mac and Linux use the browser. RecipeSage has native apps for all three.",
    },
    {
      feature: "Cook Mode (full-screen, distraction-free cooking view)",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Built-in kitchen toolkit",
      recipesage: true,
      competitor: "partial",
      note: "BigOven converts units within a recipe. RecipeSage's toolkit adds a measurement converter, a pan and bakeware converter that suggests bake time and temperature adjustments, and a cooking-temperature reference for safe internal temperatures.",
    },
    {
      feature: "Printable PDF cookbook generator",
      recipesage: true,
      competitor: false,
      note: "RecipeSage's Cookbook Generator compiles your recipes into one printable PDF with a cover page, optional table of contents, and each recipe on its own page.",
    },
  ],
  whySwitch: [
    {
      title: "Cook Mode",
      body: "RecipeSage's full-screen Cook Mode shows the ingredients and steps together, lets you check off each as you cook, scale servings on the fly, and keeps the screen awake with a large adjustable font. BigOven has no cook mode.",
    },
    {
      title: "Built-in kitchen toolkit",
      body: "RecipeSage has built-in converters for units, pan sizes, and cooking temperatures. BigOven converts units within a recipe but has no pan or temperature tools.",
    },
    {
      title: "No ads",
      body: "RecipeSage is ad-free and tracking-free. Cooking from a tablet in the kitchen shouldn't mean video pop-ups in the middle of your recipe.",
    },
    {
      title: "No 200-recipe cap and no Pro paywall on basics",
      body: "Custom collections, advanced search filters, nutrition, and multi-account sharing are free in RecipeSage. In BigOven all of these require Pro.",
    },
    {
      title: "Your data is portable",
      body: "RecipeSage gives you full export to JSON-LD, PDF, or text at any time. BigOven's cloud product has no bulk export.",
    },
    {
      title: "Instant photo, PDF, and Word import",
      body: "RecipeSage parses photos, PDFs, and documents in seconds. BigOven's RecipeScan is a separate human-assisted service that takes days.",
    },
    {
      title: "A real browser extension",
      body: "RecipeSage's Clip Tool is a proper Firefox and Chrome extension. BigOven's clipper is a bookmarklet you drag into your bookmarks bar.",
    },
    {
      title: "Turn your collection into a printable cookbook",
      body: "RecipeSage's Cookbook Generator assembles your recipes into a single PDF, with a cover page, an optional table of contents, and each recipe on its own page with its image and nutrition. It's an easy way to print a personal cookbook or give one as a gift. BigOven has no built-in cookbook generator.",
    },
  ],
  competitorWins: [],
  migration: {
    headline: "Bringing your BigOven recipes over",
    summary:
      "BigOven doesn't offer a bulk export, so this one takes a little more work than our other importers. Here are the practical options.",
    steps: [
      {
        body: "Option A (recommended for small collections): make each of your saved BigOven recipes public, then use RecipeSage's Clip Tool browser extension to import them from their public URLs.",
      },
      {
        body: "Option B: use BigOven's per-recipe Print or Share view to copy each URL into RecipeSage's URL importer.",
      },
      {
        body: "Either way, the new recipes land in your RecipeSage account tagged with an import label so you can review the batch.",
      },
    ],
  },
  faqs: [
    {
      q: "How can RecipeSage be free when BigOven needs Pro for basic features?",
      a: "RecipeSage is a side project from the two of us, not a business with employees and ad sales. We don't have to put ads in your way or paywall features to keep the lights on.",
    },
    {
      q: "Do I lose access to the BigOven recipe community?",
      a: "BigOven's public community of rated and reviewed recipes stays on BigOven, so you can keep using BigOven for that whenever you like. This import copies your saved recipes into RecipeSage, where you can keep, plan, and cook them.",
    },
    {
      q: "Will RecipeSage scan photos of recipes the way BigOven RecipeScan does?",
      a: "Yes, and it's instant rather than a 2-5 day turnaround. Our import handles photos, PDFs, and Word documents directly.",
    },
    {
      q: "Will my BigOven meal plan come across?",
      a: "Recipe content can come across via the options above. Past meal plan history doesn't carry over, but drag-and-drop makes the upcoming week quick to rebuild.",
    },
    {
      q: "Is there a free alternative to BigOven?",
      a: "Yes. RecipeSage is a free, open source alternative to BigOven, with no paywall and no ads. You can import your recipes, plan meals, build shopping lists, track nutrition, and use it on the web, desktop, iOS, and Android. If you ever decide to leave, you can export everything or self-host.",
    },
  ],
  closing: [
    "If you'd rather have a personal recipe keeper without ads, recipe caps, or a Pro paywall on basics, RecipeSage is built exactly for that. RecipeSage is free, so there's no reason not to try it :)",
  ],
};
