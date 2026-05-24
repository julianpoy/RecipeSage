import type { CompetitorData } from "./types";

export const mela: CompetitorData = {
  slug: "mela",
  name: "Mela",
  url: "https://mela.recipes/",
  tagline: "The free, open source Mela alternative for iOS, Android, Windows, and Linux",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. It runs on Android, iOS, and in any browser, not just Apple devices.",
  cardSummary:
    "Apple-only. No Android, no Windows, no Linux, no web app, and no Apple Watch app.",
  intro: [
    "Mela is a native iOS and macOS app with a one-time in-app purchase per storefront: $6.99 on iOS/iPadOS and $14.99 on macOS. Sync goes through the user's own iCloud account, but there's no Android app, no Windows or Linux app, and no web app.",
    "My wife and I made RecipeSage as the recipe app we wanted ourselves. It's free, open source, and runs in any browser, on iOS, and on Android. Auto-import works from URLs, photos, PDFs, and Word docs, and the whole household can use it from any device with a browser.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. No subscription, no per-platform fees, runs on Android and any browser too.",
    competitor:
      "In-app purchase per device type: $6.99 iOS/iPadOS and $14.99 macOS. An Apple-only household with iPhone and Mac pays roughly $21.98.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "~$22 total",
    },
    {
      feature: "Web app (use from any browser)",
      recipesage: true,
      competitor: false,
    },
    { feature: "iOS app", recipesage: "Free", competitor: "$6.99" },
    { feature: "Android app", recipesage: "Free", competitor: false },
    {
      feature: "macOS app",
      recipesage: "Free",
      competitor: "$14.99",
    },
    {
      feature: "Windows and Linux",
      recipesage: "Free",
      competitor: false,
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
      feature: "Import from PDF and Word documents",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Browser extension (Firefox, Chrome)",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "RSS-style recipe blog feed reader",
      recipesage: false,
      competitor: true,
      note: "Mela's signature feature. Subscribe to cooking blog feeds and triage new posts inside the app.",
    },
    {
      feature: "Drag-and-drop meal planner",
      recipesage: true,
      competitor: "partial",
      note: "Mela's meal planner uses your device's native calendar. RecipeSage has inbuilt scheduling and can also use your device's calendar.",
    },
    {
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: false,
      note: "Mela's grocery list lives in Apple Reminders as a flat, unsorted list.",
    },
    {
      feature: "Recipe scaling and metric/imperial conversion",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Built-in nutrition (macros, vitamins, minerals)",
      recipesage: true,
      competitor: "partial",
      note: "Mela stores and displays whatever nutrition text the source page provided but doesn't have any auto-fill support for nutrition.",
    },
    {
      feature: "Multi-household free hosted account",
      recipesage: true,
      competitor: false,
      note: "Mela shares a whole library through iCloud, with no per-recipe permissions or read-only role. Every participant needs an Apple ID and a Mela install.",
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
      competitor: true,
      note: "Both are open: Mela exports a documented plain-JSON .melarecipe format, and RecipeSage supports well-recognized standardized formats.",
    },
  ],
  whySwitch: [
    {
      title: "Works on Android, Windows, and Linux",
      body: "RecipeSage runs natively on every device, not just Apple. Mela is Apple-only, so a household with even one non-Apple device can't share a library.",
    },
    {
      title: "Use it from any browser",
      body: "RecipeSage works on a Chromebook, a Linux laptop, a work PC, or any computer with a browser. Mela has no web app at all.",
    },
    {
      title: "Free instead of per-storefront unlocks",
      body: "RecipeSage is free on every device. Mela charges $6.99 on iOS and $14.99 on macOS, and each require a separate purchase.",
    },
    {
      title: "Collaboration with separate accounts",
      body: "Each family member can have their own RecipeSage account and still share selected recipes, plans, and shopping lists. Mela's shared library uses one iCloud library with no control over personal/shared recipes.",
    },
    {
      title: "Built-in nutrition tracking",
      body: "RecipeSage tracks macros, vitamins, and minerals per serving, and you can paste a nutrition label to auto-fill.",
    },
  ],
  competitorWins: [
    {
      title: "Recipe blog feed subscriptions",
      body: "Mela lets you subscribe to cooking blogs by RSS and triage new posts in a Feeds inbox, promoting the ones you like into your library. RecipeSage is focused only on personal recipe collecting and has no inbuilt feed-reader.",
    },
  ],
  migration: {
    headline: "Bringing your Mela recipes over",
    summary:
      "RecipeSage has a dedicated Mela importer. It accepts both Mela's bulk archive (.melarecipes) and individual recipe files (.melarecipe).",
    steps: [
      {
        body: "In the Mela desktop app, right-click the All section in the left side menu.",
      },
      {
        body: "Click Export Recipes.",
      },
      {
        body: "Select a destination to save the .melarecipes archive.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then Mela, and upload the .melarecipes file you exported.",
      },
    ],
    docsUrl: "https://docs.recipesage.com/docs/tutorials/settings/import/mela/",
    docsLabel: "Read the full Mela import guide",
    importUrl: "/app/settings/import/mela",
  },
  faqs: [
    {
      q: "What if my family is mixed Apple and Android?",
      a: "This is exactly the case where RecipeSage tends to fit better than Mela. RecipeSage has native Android and iOS apps and a real web app, so everyone in the household can use the same library from whatever device they happen to own.",
    },
    {
      q: "Can I keep Mela on iOS and use RecipeSage on Android at the same time?",
      a: "Yes, but keep in mind that the two apps don't interface with each other. The best part about RecipeSage is that data is shared between all of your devices.",
    },
    {
      q: "Will Mela's recipe blog feed reader work in RecipeSage?",
      a: "No. RecipeSage doesn't have an RSS feed reader. There are many dedicated blog feed readers that do the job well, and you can clip any recipe that you want to save using RecipeSage's excellent browser extension directly into your RecipeSage collection.",
    },
  ],
  closing: [
    "If you share a household with someone on Android, or want to use your recipes from a Chromebook, a Linux machine, or a borrowed computer, RecipeSage might be a better than Mela. RecipeSage is free, so there's no harm in giving it a try alongside Mela for a few weeks :)",
  ],
};
