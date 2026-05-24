import type { CompetitorData } from "./types";

export const crouton: CompetitorData = {
  slug: "crouton",
  name: "Crouton",
  url: "https://crouton.app/",
  tagline:
    "The free, open source Crouton alternative for Android, Windows, Linux, and the web",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. It runs in any browser, on iOS, and on Android, so the whole household can use it even if not everyone is on Apple.",
  cardSummary:
    "Apple-only recipe app with a three-tier pricing model. AI photo import and the recipe-blog Discover feed are paywalled behind a $14.99/year subscription.",
  intro: [
    "Crouton is a recipe collection app that runs only on Apple devices (iPhone, iPad, Mac, Apple Watch, Vision Pro) and syncs through iCloud. Pricing has three tiers: a free tier with a small recipe import cap, a $24.99 one-time Plus unlock for unlimited recipes, and a $14.99/year Discover subscription that adds an AI photo importer and the recipe-blog feed reader.",
    "My wife and I made RecipeSage as the recipe app we wanted ourselves. It's free, open source, and runs in any browser, on iOS, and on Android. You can import from URLs, photos, PDFs, and Word docs entirely for free.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. No subscription, no ads, no per-device fees, and no selling your data.",
    competitor:
      "Three tiers. Free with a small recipe import cap, $24.99 one-time for Plus, and $14.99/year for Discover (required for AI photo import and the recipe-blog feed reader).",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free & open source",
      competitor: "Free with a cap, $24.99 one-time Plus, $14.99/year Discover",
    },
    {
      feature: "Web app (use from any browser)",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "iOS app",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Android app",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "macOS app",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Windows and Linux",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Apple Watch app",
      recipesage: false,
      competitor: true,
    },
    {
      feature: "Auto import from a URL",
      recipesage: true,
      competitor: true,
      note: "Crouton's importer compatibility is more limited than RecipeSage's"
    },
    {
      feature: "AI import from a single photo",
      recipesage: true,
      competitor: true,
      note: "RecipeSage's AI photo import is free. Crouton's AI photo import requires the $14.99/year Discover subscription.",
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
      feature: "Firefox and Chrome browser extension",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Drag-and-drop meal planner",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: "partial",
      note: "Crouton's groceries tab syncs with Apple Reminders.",
    },
    {
      feature: "Recipe scaling and metric/imperial conversion",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Built-in nutrition tracking (macros, vitamins, minerals)",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "RSS-style recipe blog feed reader",
      recipesage: false,
      competitor: true,
      note: "Crouton's Discover tab is a feed reader for recipe blogs with one-tap import. It requires the $14.99/year Discover subscription.",
    },
    {
      feature: "In-app cooking timers and Live Activities",
      recipesage: false,
      competitor: true,
      note: "Crouton auto-detects timers from recipe text and surfaces them on the Lock Screen, Apple Watch, and Vision Pro.",
    },
    {
      feature: "Hands-free cook mode (TrueDepth wink/mouth control)",
      recipesage: false,
      competitor: true,
    },
    {
      feature: "Real multi-user collaboration with separate accounts",
      recipesage: true,
      competitor: false,
      note: "Crouton shares libraries through iCloud which is extremely limited. RecipeSage has in-depth sharing permissions and collections.",
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
      feature: "Data portability",
      recipesage: true,
      competitor: true,
      note: "Crouton exports a proprietary .crumb file and PDF. RecipeSage supports well-recognized standardized formats including JSON-LD.",
    },
  ],
  whySwitch: [
    {
      title: "Works on Android, Windows, and Linux",
      body: "RecipeSage runs in any browser and has a native Android app. Crouton is Apple-only. Its officially recommended way to share a recipe with an Android friend is to email a PDF.",
    },
    {
      title: "A web app",
      body: "Open RecipeSage in any browser, on any computer. Crouton has no web app, so a Chromebook, a work Windows laptop, or a Linux box can't see your library at all.",
    },
    {
      title: "Import recipes from images without a subscription",
      body: "Import from photo is entirely free in RecipeSage. Crouton's photo import sits behind the $14.99/year Discover subscription.",
    },
    {
      title: "Photo, PDF, and Word import",
      body: "RecipeSage imports recipes from photos, PDFs, and Word documents for free without paying for a Discover subscription.",
    },
    {
      title: "Firefox and Chrome browser extension",
      body: "The RecipeSage Clip Tool browser extension installs in Firefox or Chrome and captures a recipe from any site in one click.",
    },
    {
      title: "Built-in nutrition tracking",
      body: "RecipeSage tracks macros, vitamins, and minerals per serving on your recipes. It can also auto-fill from a pasted nutrition label.",
    },
    {
      title: "Multi-user collaboration with separate accounts",
      body: "Each family member can have their own RecipeSage account and still share recipes, plans, and shopping lists.",
    },
    {
      title: "Open source and self-hostable",
      body: "RecipeSage's code is on GitHub under the AGPL and you can run it on your own server. Crouton is closed source and runs on Apple's iCloud infrastructure.",
    },
  ],
  competitorWins: [
    {
      title: "Hands-free TrueDepth cook mode",
      body: "Right-eye wink advances a step, left-eye wink reverses, opening your mouth shows the ingredients list. Processing is on-device. This is something RecipeSage doesn't do.",
    },
    {
      title: "Combustion Predictive Thermometer integration",
      body: "If you already own a Combustion Predictive Thermometer (Combustion bought Crouton in 2025), probe temperatures stream directly into the recipe view. RecipeSage doesn't integrate with smart thermometers.",
    },
  ],
  migration: {
    headline: "Bringing your Crouton recipes over",
    summary:
      "RecipeSage has a dedicated Crouton importer. It accepts Crouton's bulk export, a .zip archive of .crumb files.",
    steps: [
      {
        body: "In the Crouton desktop app, click Crouton in the top bar next to the Apple logo.",
      },
      {
        body: "Open Crouton's settings.",
      },
      {
        body: "Click Export Recipes.",
      },
      {
        body: "Select a destination to save the .zip archive.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then Crouton, and upload the .zip file you exported.",
      },
    ],
    docsUrl:
      "https://docs.recipesage.com/docs/tutorials/settings/import/crouton/",
    docsLabel: "Read the full Crouton import guide",
    importUrl: "/app/settings/import/crouton",
  },
  faqs: [
    {
      q: "Will Crouton's hands-free wink cook mode work in RecipeSage?",
      a: "No. The TrueDepth wink and mouth-open navigation is genuinely unique to Crouton and we don't have an equivalent. RecipeSage will keep your screen on while cooking but isn't the same experience.",
    },
    {
      q: "Can I use both Crouton and RecipeSage at the same time?",
      a: "Sure. Just keep in mind that one of the best features about RecipeSage is that all of your recipes are shared between all of your devices.",
    },
  ],
  closing: [
    "If you want Android, the web, Linux, or non-Apple family members covered in the same recipe library, or you want to share your library between multiple family members or friends, that's where RecipeSage fits better. It's free, so there's no harm in trying it alongside Crouton for a couple of weeks :)",
  ],
};
