import type { CompetitorData } from "./types";

export const recipeKeeper: CompetitorData = {
  slug: "recipe-keeper",
  name: "Recipe Keeper",
  url: "https://recipekeeperonline.com/",
  tagline: "The free, open source Recipe Keeper alternative",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. It runs in any browser, on iOS, and on Android, with no recipe cap and no per-platform upgrade fees.",
  seoDescription:
    "A free, open source Recipe Keeper alternative. RecipeSage adds web clipping, photo and PDF import, meal planning, and nutrition tracking. Always free.",
  cardSummary:
    "Freemium with a 20-recipe cap, then a one-time Pro upgrade purchased separately on each platform.",
  intro: [
    "Recipe Keeper is a closed-source recipe app where the free tier stops at 20 recipes. Past that, Pro is a one-time purchase per platform: around $19.99 on iOS, $19.99 on Android, $29.99 on macOS, and a separate purchase on Windows. Apple Family Sharing is not enabled, so two iOS devices on different Apple IDs each need their own Pro upgrade. There's no web app and no real browser extension.",
    "My wife and I made RecipeSage as the recipe app we wanted ourselves. It's free, open source, and runs in any browser, on iOS, and on Android. Auto-import works from URLs, photos, PDFs, and Word docs, and there's a Firefox and Chrome extension for one-click clipping from any desktop.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. Unlimited recipes, no ads, no subscription, no per-device fees. Open source under the AGPL.",
    competitor:
      "Free up to 20 recipes. Pro is a one-time upgrade purchased separately on each platform: around $19.99 iOS, $19.99 Android, $29.99 macOS, plus a separate purchase on Windows.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "Free up to 20 recipes, then paid per platform",
    },
    {
      feature: "Web app (use from any browser)",
      recipesage: true,
      competitor: false,
    },
    { feature: "iOS app", recipesage: "Free", competitor: "$19.99 Pro" },
    { feature: "Android app", recipesage: "Free", competitor: "$19.99 Pro" },
    {
      feature: "Mac and Windows",
      recipesage: "Free web app",
      competitor: "$29.99 Mac, separate Windows purchase",
    },
    {
      feature: "Apple Family Sharing",
      recipesage: "Not needed",
      competitor: false,
      note: "Recipe Keeper does not enable Family Sharing. Each Apple ID needs its own Pro upgrade.",
    },
    {
      feature: "Free tier recipe cap",
      recipesage: "No cap",
      competitor: "20 recipes",
    },
    {
      feature: "Firefox and Chrome extension",
      recipesage: true,
      competitor: false,
      note: "Recipe Keeper has no official browser extension so no convenient way of clipping recipes.",
    },
    {
      feature: "Auto import from a URL",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Import from a photo (OCR)",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Import from PDF",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Import from Word documents",
      recipesage: true,
      competitor: false,
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
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Recipe scaling and metric/imperial conversion",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Nutrition tracking (macros, vitamins, minerals)",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Typo-tolerant search",
      recipesage: true,
      competitor: false,
      note: "Recipe Keeper's search is substring-based on the indexed fields, not fuzzy.",
    },
    {
      feature: "Real multi-user collaboration",
      recipesage: true,
      competitor: false,
      note: "Recipe Keeper's only path to share a library is to sign multiple devices into the same account.",
    },
    {
      feature: "Works offline",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Open source",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Data portability",
      recipesage: true,
      competitor: "partial",
      note: "Recipe Keeper exports an undocumented .zip with an HTML file and an images folder. RecipeSage supports well-recognized standardized formats.",
    },
    {
      feature: "Public sharing by link or embed, no account needed",
      recipesage: true,
      competitor: false,
      note: "RecipeSage gives you a public profile to share a recipe, a label, or your whole collection by link, plus website embed codes. Recipe Keeper shares one recipe at a time by email or social, with no public profile or embed.",
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
      title: "No 20-recipe cap and no per-platform upgrade fees",
      body: "RecipeSage is free on every device and never caps your library. Equipping a household across iPhone, Android, and a desktop in Recipe Keeper Pro passes $50 to $70.",
    },
    {
      title: "Use it from any browser",
      body: "RecipeSage is a web app, so it works on a borrowed laptop, a Chromebook, or any computer with a browser. Recipe Keeper has no web app at all.",
    },
    {
      title: "Real desktop browser extension",
      body: "Clip recipes from any site with one click in Firefox or Chrome. Recipe Keeper has no official browser extension, so desktop clipping leans on the in-app browser which can be clunky.",
    },
    {
      title: "Automatic nutrition clipping",
      body: "RecipeSage can auto-fill nutrition from a pasted nutrition label. Recipe Keeper's nutrition field is something you fill in by hand.",
    },
    {
      title: "Collaboration with separate accounts",
      body: "Each family member or friend can have their own RecipeSage account and still share recipes, plans, and shopping lists. Recipe Keeper's shared library means everyone signs into the same login.",
    },
    {
      title: "Open source and self-hostable",
      body: "RecipeSage's code is on GitHub under the AGPL, and exports use well-recognized standardized formats. Recipe Keeper is closed source with a proprietary undocumented .zip.",
    },
    {
      title: "Turn your collection into a printable cookbook",
      body: "RecipeSage's Cookbook Generator assembles your recipes into a single PDF, with a cover page, an optional table of contents, and each recipe on its own page with its image and nutrition. It's an easy way to print a personal cookbook or give one as a gift. Recipe Keeper has no built-in cookbook generator.",
    },
  ],
  competitorWins: [
    {
      title: "Amazon Alexa skill",
      body: "Recipe Keeper has an Alexa skill for hands-free recipe lookup, ingredient and direction read-back, and adding items to the shopping list from an Echo. RecipeSage doesn't have one.",
    },
  ],
  migration: {
    headline: "Bringing your Recipe Keeper recipes over",
    summary:
      "RecipeSage has a dedicated Recipe Keeper importer. Titles, ingredients, directions, photos, notes, and categories all come across.",
    steps: [
      {
        body: "In Recipe Keeper, open Settings, Import/Export, then 'Export recipes to' and pick 'Recipe Keeper .zip file'. Save the .zip to your device.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then Recipe Keeper, and upload the .zip just as you exported it.",
      },
      {
        body: "RecipeSage runs the import in the background and tags every imported recipe with a timestamped label so the batch is easy to review or undo.",
      },
    ],
    docsUrl:
      "https://docs.recipesage.com/docs/tutorials/settings/import/recipe-keeper/",
    docsLabel: "Read the full Recipe Keeper import guide",
    importUrl: "/app/settings/import/recipe-keeper",
  },
  faqs: [
    {
      q: "Can I keep using Recipe Keeper while I try RecipeSage?",
      a: "Yes. Importing into RecipeSage doesn't touch your Recipe Keeper account or the .zip you exported. Take a few weeks to see if RecipeSage fits your kitchen before you decide.",
    },
    {
      q: "Will my Recipe Keeper categories and photos come across?",
      a: "Yes. The Recipe Keeper .zip includes a structured HTML file plus an images folder, and our importer covers titles, ingredients, directions, notes, categories, and photos.",
    },
    {
      q: "Do I have to buy anything to use RecipeSage on every device?",
      a: "No. The web app, iOS app, and Android app are all free, with no per-platform upgrade. Your whole household can use it without anyone paying anything.",
    },
    {
      q: "Is there a free alternative to Recipe Keeper?",
      a: "Yes. RecipeSage is a free, open source alternative to Recipe Keeper, with no subscription and no ads. You can import your recipes, plan meals, build shopping lists, track nutrition, and use it on the web, iOS, and Android. If you ever decide to leave, you can export everything or self-host.",
    },
  ],
  closing: [
    "If you've hit Recipe Keeper's 20-recipe cap or you'd rather not pay a separate Pro upgrade on every platform, export the .zip and try RecipeSage. It's free, so there's really no downside :)",
  ],
};
