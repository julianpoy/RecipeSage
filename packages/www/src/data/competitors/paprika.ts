import type { CompetitorData } from "./types";

export const paprika: CompetitorData = {
  slug: "paprika",
  name: "Paprika",
  url: "https://www.paprikaapp.com/",
  tagline: "The free, open source Paprika alternative",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. It runs in any browser, on iOS, on Android, and as native desktop apps for Windows, macOS, and Linux, with no per-device fees.",
  seoDescription:
    "A free, open source Paprika alternative. RecipeSage imports recipes, plans meals, and syncs across web, desktop, iOS, and Android with no per-device fee. Always free.",
  cardSummary:
    "Paid per platform. $4.99 mobile, $29.99 desktop, no web app, no built-in nutrition.",
  intro: [
    "Paprika is a paid recipe app sold per platform: $4.99 on iOS, $4.99 on Android, $29.99 each on macOS and Windows. There's no web app, and each license covers a single platform.",
    "My wife and I made RecipeSage as the recipe app we wanted ourselves. It's free, open source, and runs in any browser, on iOS, on Android, and on the desktop. Auto-import works from URLs, photos, PDFs, and Word docs.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. No paywall, no ads, no per-device fees, and no selling your data.",
    competitor:
      "One-time purchase per platform: $4.99 iOS, $4.99 Android, $29.99 macOS, $29.99 Windows. A full household easily passes $40.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "Paid per platform (around $40 for a household)",
    },
    {
      feature: "Web app (use from any browser)",
      recipesage: true,
      competitor: false,
    },
    { feature: "iOS app", recipesage: "Free", competitor: "$4.99" },
    { feature: "Android app", recipesage: "Free", competitor: "$4.99" },
    {
      feature: "Native desktop app (Windows, macOS, Linux)",
      recipesage: "Free",
      competitor: "$29.99 each (Mac and Windows only)",
      note: "Paprika sells native Mac and Windows apps separately and has no Linux app. RecipeSage's desktop app is free on all three.",
    },
    {
      feature: "Apple Watch app",
      recipesage: false,
      competitor: true,
      note: "Paprika has a watchOS app for timers and grocery list viewing.",
    },
    {
      feature: "Auto import from a URL",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Import from a photo (OCR)",
      recipesage: true,
      competitor: false,
      note: "Paprika has no native OCR. AI photo scanning is announced for Paprika 4 but isn't available yet.",
    },
    {
      feature: "Import from PDF and Word documents",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Firefox and Chrome extension",
      recipesage: true,
      competitor: false,
      note: "Paprika offers a bookmarklet only. No official browser extension.",
    },
    {
      feature: "Drag-and-drop meal planner",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Recurring meal plan items",
      recipesage: true,
      competitor: false,
      note: "Paprika adds meals to specific dates only. You can save and reapply menus, but there's no repeating option.",
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
      competitor: false,
    },
    {
      feature: "Typo-tolerant search",
      recipesage: true,
      competitor: "partial",
      note: "Paprika search is substring-based, not fuzzy.",
    },
    {
      feature: "Real multi-user collaboration",
      recipesage: true,
      competitor: false,
      note: "Paprika households share one login. Separate accounts and cookbook sharing are announced for Paprika 4 but aren't available yet.",
    },
    {
      feature: "Works offline",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Cook Mode (full-screen, distraction-free cooking view)",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Built-in kitchen toolkit",
      recipesage: true,
      competitor: "partial",
      note: "Paprika converts ingredient units. RecipeSage's toolkit adds a pan and bakeware converter that suggests bake time and temperature adjustments and a cooking-temperature reference for safe internal temperatures.",
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
      competitor: "Proprietary",
      note: "Paprika's export is a non-standard .paprikarecipes archive. RecipeSage supports well-recognized standardized formats.",
    },
    {
      feature: "Public sharing by link or embed, no account needed",
      recipesage: true,
      competitor: false,
      note: "RecipeSage gives you a public profile to share a recipe, a label, or your whole collection by link, plus website embed codes. Paprika shares recipes only by emailing or AirDropping its proprietary files.",
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
      title: "Kitchen tools beyond unit conversion",
      body: "RecipeSage adds a pan and bakeware converter and a safe cooking-temperature reference on top of unit conversion. Paprika converts ingredient units only.",
    },
    {
      title: "No per-device fees",
      body: "Setting up a household with Paprika across phone, tablet, and desktop quickly passes $40. RecipeSage is free on every device, for everyone in the family.",
    },
    {
      title: "Use it from any browser",
      body: "RecipeSage is a real web app, so it works on a borrowed laptop, a Chromebook, or any computer with a browser. Paprika has no web app at all.",
    },
    {
      title: "Photo, PDF, and Word import",
      body: "RecipeSage imports from photos, PDFs, and Word docs in addition to URLs. Paprika has no native OCR and no PDF or Word import.",
    },
    {
      title: "Built-in nutrition tracking",
      body: "RecipeSage tracks macros, vitamins, and minerals per serving, and you can paste a nutrition label to auto-fill. Paprika doesn't track nutrition at all.",
    },
    {
      title: "Collaboration with separate accounts",
      body: "Each family member can have their own RecipeSage account and still share recipes, plans, and shopping lists. Paprika households share one login.",
    },
    {
      title: "Open source",
      body: "RecipeSage's code is on GitHub under the AGPL. You can export everything in standard formats.",
    },
    {
      title: "Share your recipes with anyone",
      body: "RecipeSage gives you a public profile to share a single recipe, a whole label, or your entire collection by a link anyone can open without an account, plus embed codes to drop a recipe onto a website or blog. Paprika only shares by emailing or AirDropping its proprietary files.",
    },
    {
      title: "Turn your collection into a printable cookbook",
      body: "RecipeSage's Cookbook Generator assembles your recipes into a single PDF, with a cover page, an optional table of contents, and each recipe on its own page with its image and nutrition. It's an easy way to print a personal cookbook or give one as a gift. Paprika has no built-in cookbook generator.",
    },
  ],
  competitorWins: [
    {
      title: "Apple Watch app",
      body: "Paprika has a watchOS app for timers and grocery lists on your wrist. RecipeSage doesn't have an Apple Watch app.",
    },
    {
      title: "Pantry with expiration dates",
      body: "Paprika's pantry tracks expiration dates and can uncheck items you already have from the grocery list. RecipeSage's doesn't do this.",
    },
  ],
  migration: {
    headline: "Bringing your Paprika recipes over",
    summary:
      "RecipeSage has a one-click Paprika importer. Titles, ingredients, directions, source URLs, notes, photos, and categories all come across.",
    steps: [
      {
        body: "In Paprika, go to Settings and choose Export Recipes. Save the .paprikarecipes file.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then Paprika, and upload the file you just exported.",
      },
      {
        body: "RecipeSage runs the import in the background so you can try things out while the import happens.",
      },
    ],
    docsUrl: "https://docs.recipesage.com/docs/tutorials/settings/import/paprika/",
    docsLabel: "Read the full Paprika import guide",
    importUrl: "/app/settings/import/paprika",
  },
  faqs: [
    {
      q: "Is RecipeSage actually free? What's the catch?",
      a: "Genuinely free. No ads, no premium tier, no email upsells. We accept contributions from people who want to support development, but every feature is available to everyone.",
    },
    {
      q: "Can I keep using Paprika while I try RecipeSage?",
      a: "Yes. Importing into RecipeSage doesn't touch your Paprika account. Take a few weeks to see if RecipeSage fits your kitchen before you decide.",
    },
    {
      q: "Will my Paprika categories and ratings come across?",
      a: "Yes. Paprika categories map to RecipeSage labels, and ratings, notes, photos, and source URLs all come through. Custom aisles in the grocery list don't import, but you can rebuild them quickly.",
    },
    {
      q: "Is there a free alternative to Paprika?",
      a: "Yes. RecipeSage is a free, open source alternative to Paprika, with no paywall and no ads. You can import your recipes, plan meals, build shopping lists, track nutrition, and use it on the web, desktop, iOS, and Android. If you ever decide to leave, you can export everything or self-host.",
    },
  ],
  closing: [
    "Try RecipeSage alongside Paprika for a couple of weeks. It's free, so if it works for you, switch over. If it doesn't, your Paprika library is still right where you left it.",
  ],
};
