import type { CompetitorData } from "./types";

export const anylist: CompetitorData = {
  slug: "anylist",
  name: "AnyList",
  url: "https://www.anylist.com/",
  tagline: "The free, open source AnyList alternative",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. It runs in any browser, on iOS, and on Android, with no paywall on web access and no Apple-only assumptions.",
  cardSummary:
    "Free for shared shopping lists, but web access, meal planning, and more than 5 recipe imports require the AnyList Complete subscription.",
  intro: [
    "AnyList is a shopping list and recipe app. Their free tier covers shared shopping lists and basic recipe collection, but web access, the meal planner, the Apple Watch app, location reminders, item photos, and recipe imports (more than 5) all require AnyList Complete which costs $9.99 per year for an individual or $14.99 per year for a household.",
    "My wife and I made RecipeSage as a free, open source alternative. The web app, meal planner, unlimited recipe imports, nutrition tracking, and photo, PDF, and Word document import are all free, with no subscription and no per-feature gating.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. No subscription, no ads. Unlimited recipes, meal planning, web access, and shopping lists for every account.",
    competitor:
      "Very basic free tier for shared shopping lists and up to 5 imported recipes. AnyList Complete is $9.99/year for an individual or $14.99/year for a household. Web app, meal planning, Apple Watch, location reminders, item photos, and unlimited recipe imports all require payment.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "$9.99 to $14.99/year for most features",
    },
    {
      feature: "Web app",
      recipesage: true,
      competitor: true,
      note: "AnyList requires a subscription to use their web app, no free tier access.",
    },
    { feature: "iOS app", recipesage: true, competitor: true },
    {
      feature: "Android app",
      recipesage: true,
      competitor: "partial",
      note: "AnyList's Android app is less polished than its iOS app.",
    },
    {
      feature: "macOS app",
      recipesage: true,
      competitor: true,
      note: "RecipeSage is fully functional within your browser and can be installed to your desktop via Chrome.",
    },
    {
      feature: "Apple Watch app",
      recipesage: false,
      competitor: true,
    },
    {
      feature: "Browser extension (Firefox, Chrome)",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Auto import from a URL",
      recipesage: true,
      competitor: true,
      note: "AnyList limits this to 5 total imports for free",
    },
    {
      feature: "Import from a photo (OCR)",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Import from PDF and Word documents",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Free drag-and-drop meal planner",
      recipesage: true,
      competitor: true,
      note: "Meal planning is an AnyList Complete feature.",
    },
    {
      feature: "Reusable meal-plan templates",
      recipesage: "partial",
      competitor: true,
      note: "AnyList's v6 Templates are more developed than RecipeSage's equivalent today.",
    },
    {
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Per-store category sets",
      recipesage: "partial",
      competitor: true,
      note: "AnyList's implementation is more complete",
    },
    {
      feature: "Multi-store price tracker with running total",
      recipesage: false,
      competitor: true,
      note: "AnyList is designed around shopping lists first, while RecipeSage prioritizes recipes first.",
    },
    {
      feature: "Location-based store reminders",
      recipesage: false,
      competitor: true,
    },
    {
      feature: "Barcode scanning for shopping items",
      recipesage: false,
      competitor: true,
    },
    {
      feature: "Nutrition tracking (macros, vitamins, minerals)",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Typo-tolerant search",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Real multi-user collaboration",
      recipesage: true,
      competitor: true,
    },
    { feature: "Works offline", recipesage: true, competitor: true },
    { feature: "Open source", recipesage: true, competitor: false },
    { feature: "Self-hostable", recipesage: true, competitor: false },
    {
      feature: "Data portability",
      recipesage: true,
      competitor: false,
      note: "AnyList has no bulk export. Recipes and lists can be emailed or printed one at a time. RecipeSage exports to JSON-LD, PDF, and text.",
    },
  ],
  whySwitch: [
    {
      title: "No paywall on web, meal planner, or recipe imports",
      body: "RecipeSage's web app, drag-and-drop meal planner, and recipe imports are all free. AnyList paywalls all three behind Complete and caps the free tier at 5 imported recipes total.",
    },
    {
      title: "Data is not held hostage",
      body: "RecipeSage exports your full library to JSON-LD, PDF, or text any time. AnyList has no bulk export. The only official options are emailing or printing recipes and lists one at a time.",
    },
    {
      title: "Nutrition and richer import",
      body: "RecipeSage tracks macros, vitamins, and minerals per serving, and imports from photos, PDFs, and Word documents. AnyList offers none of those.",
    },
    {
      title: "Open source and self-hostable",
      body: "RecipeSage is AGPL-licensed and you can run it on your own server. AnyList is closed source with no public API and the cloud is the only sync target.",
    },
    {
      title: "Cross-platform without Apple bias",
      body: "RecipeSage runs equally well in any browser, on iOS, and on Android. AnyList's deepest features assume the Apple ecosystem, and Chromebook, Windows, and Linux users can only reach AnyList through the Complete-gated web app.",
    },
  ],
  competitorWins: [
    {
      title: "Best-in-class shopping list",
      body: "Per-store category sets, multi-store price comparison with a running total at checkout, location-based reminders when you arrive at a store, and barcode scanning. RecipeSage's shopping list is solid but doesn't match this depth.",
    },
    {
      title: "First-class Apple Watch app",
      body: "AnyList's Apple Watch app includes complications and voice, Scribble, and emoji input for adding items from the wrist. RecipeSage doesn't have a watch app.",
    },
  ],
  migration: {
    headline: "Bringing your AnyList recipes over",
    summary:
      "There's no dedicated AnyList importer, and AnyList itself doesn't offer a bulk recipe export. The practical path today is the RecipeSage Clip Tool browser extension, about two clicks per recipe.",
    steps: [
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "Install the free RecipeSage Clip Tool extension for Firefox or Chrome.",
      },
      {
        body: "Sign in to AnyList in the same browser, open a saved recipe, and click the RecipeSage extension icon to import it. About two clicks per recipe. Repeat for each one you want to bring over.",
      },
    ],
    note: "AnyList doesn't offer a bulk recipe export, so per-recipe re-clipping is the practical option today. If you've kept the original source URLs of your AnyList recipes, RecipeSage's URL importer accepts a list of URLs in one go, which can speed things up considerably.",
  },
  faqs: [
    {
      q: "Can I keep AnyList for groceries and use RecipeSage for recipes?",
      a: "Sure. A lot of people split tools this way. Use RecipeSage for recipe organization, meal planning, and nutrition, and keep AnyList for the shopping run itself. RecipeSage's meal planner can generate a shopping list you copy across.",
    },
    {
      q: "What about my AnyList shared list with my household?",
      a: "RecipeSage has shared shopping lists too, with real multi-account collaboration (each person has their own login). You'll need to rebuild the membership in RecipeSage by inviting the same people to a new shared list, but the day-to-day shared-shopping experience is there.",
    },
  ],
  closing: [
    "If AnyList's shopping list is the main reason you use it, keep AnyList. If you mostly want a recipe organizer and meal planner with nutrition without a subscription, RecipeSage might be a better fit. RecipeSage is free, so there's no harm in giving it a try alongside AnyList for a few weeks :)",
  ],
};
