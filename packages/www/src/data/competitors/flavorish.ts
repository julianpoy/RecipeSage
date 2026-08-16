import type { CompetitorData } from "./types";

export const flavorish: CompetitorData = {
  slug: "flavorish",
  name: "Flavorish",
  url: "https://www.flavorish.ai/",
  tagline: "The free, open source Flavorish alternative",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. It runs in any browser, on iOS, on Android, and as native desktop apps for Windows, macOS, and Linux, with no subscription, and we'll import your Flavorish library, images and all, in a few clicks.",
  seoDescription:
    "A free, open source alternative to Flavorish. RecipeSage imports your Flavorish export and keeps your recipes with no subscription, on web, desktop, iOS, and Android.",
  cardSummary:
    "AI recipe app for iOS, Android, and the web. The free tier gives one-time credits for AI, social, and image imports, with unlimited use behind a $4.99/month subscription.",
  intro: [
    "Flavorish is an AI recipe app for iOS, Android, and the web that saves recipes from social media, websites, photos, and text, then turns them into meal plans and grocery lists. Flavorish gates features such as AI recipe generation, social-media imports, and image imports require Premium which costs $4.99/month or $49.99/year.",
    "My wife and I made RecipeSage as a free, open source alternative with no subscription. It runs in any browser, on iOS, on Android, and as native desktop apps for Windows, macOS, and Linux. We added a dedicated Flavorish importer, so you can bring your whole library, images and all, over in a few clicks.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. Unlimited recipes, no ads, no paywall. Open source under the AGPL.",
    competitor:
      "Free with unlimited website imports and storage, but social imports, image imports, and AI generation require premium which is $4.99/month or $49.99/year.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "$4.99/month or $49.99/year",
    },
    {
      feature: "Unlimited recipes and website imports on the free tier",
      recipesage: true,
      competitor: true,
    },
    { feature: "Ad-free", recipesage: true, competitor: true },
    { feature: "Web app", recipesage: true, competitor: true },
    { feature: "iOS app", recipesage: true, competitor: true },
    { feature: "Android app", recipesage: true, competitor: true },
    {
      feature: "Native desktop app (Windows, macOS, Linux)",
      recipesage: true,
      competitor: false,
      note: "RecipeSage has native desktop apps for Windows, macOS, and Linux. On the desktop Flavorish is the web app only.",
    },
    {
      feature: "Firefox and Chrome browser extension",
      recipesage: true,
      competitor: false,
      note: "RecipeSage's Clip Tool captures a recipe from any site in one click in Firefox or Chrome.",
    },
    { feature: "Auto import from a URL", recipesage: true, competitor: true },
    {
      feature: "Import from a photo of a recipe book",
      recipesage: true,
      competitor: "$4.99/month or $49.99/year",
      note: "RecipeSage's photo import is free. Flavorish requires Premium.",
    },
    {
      feature: "Import from PDF",
      recipesage: true,
      competitor: false,
      note: "Flavorish imports from images and text but has no PDF importer.",
    },
    {
      feature: "Import from Word and text documents",
      recipesage: true,
      competitor: "partial",
      note: "Flavorish only imports from pasted text. RecipeSage imports not only pasted text but also Word, RTF, ODT, Markdown, HTML, and text documents.",
    },
    {
      feature: "Import from a social-media video (Instagram, TikTok, YouTube, Facebook)",
      recipesage: "partial",
      competitor: "$4.99/month or $49.99/year",
      note: "RecipeSage will import a social media video so long as it has a text caption with the recipe in it (most creators include this).",
    },
    {
      feature: "AI recipe generation from ingredients or diet",
      recipesage: false,
      competitor: "$4.99/month or $49.99/year",
      note: "Flavorish generates new recipes with AI. RecipeSage's AI turns photos and text into structured recipes but does not invent new ones.",
    },
    { feature: "Meal planner", recipesage: true, competitor: true },
    {
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Recipe scaling and metric/imperial conversion",
      recipesage: true,
      competitor: "partial",
      note: "RecipeSage also has the ability to convert between metric and imperial which Flavorish does not have.",
    },
    {
      feature: "Built-in nutrition tracking (macros, vitamins, minerals)",
      recipesage: true,
      competitor: "partial",
      note: "Flavorish shows an AI nutritional estimate which may vary wildly in accuracy. RecipeSage tracks macros, vitamins, and minerals per serving, and can auto-fill from a pasted nutrition label.",
    },
    {
      feature: "Cook Mode (full-screen, distraction-free cooking view)",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Real multi-user collaboration with separate accounts",
      recipesage: true,
      competitor: false,
      note: "RecipeSage gives you the ability to coordinate a family with shared recipes, meal plans, and shopping lists.",
    },
    { feature: "Open source", recipesage: true, competitor: false },
    {
      feature: "Self-hostable",
      recipesage: true,
      competitor: false,
      note: "With RecipeSage you never have to worry about us going away, as you can always run your own copy of RecipeSage if you have someone technical in your life.",
    },
    {
      feature: "Data portability",
      recipesage: true,
      competitor: true,
      note: "Flavorish exports a .zip of your recipes, images, and collections. RecipeSage exports well-recognized standardized formats including JSON-LD, and has a dedicated Flavorish importer.",
    },
    {
      feature: "Printable PDF cookbook generator",
      recipesage: true,
      competitor: false,
      note: "RecipeSage's Cookbook Generator compiles your recipes into one printable PDF with a cover page, an optional table of contents, and each recipe on its own page.",
    },
    {
      feature: "Built-in kitchen toolkit",
      recipesage: true,
      competitor: false,
      note: "RecipeSage adds a measurement converter, a pan and bakeware converter that suggests bake time and temperature adjustments, and a built-in cooking-temperature reference.",
    },
  ],
  whySwitch: [
    {
      title: "No paywall",
      body: "Everything in RecipeSage is free for everyone to access, including photo import, PDF import, and document import. Flavorish requires $4.99/month or $49.99/year for these types of features.",
    },
    {
      title: "Firefox and Chrome browser extension",
      body: "The RecipeSage Clip Tool installs in Firefox or Chrome and captures a recipe from any site in one click.",
    },
    {
      title: "Import from PDFs and Word documents",
      body: "RecipeSage imports recipes from PDFs and from Word, RTF, ODT, Markdown, HTML, and text files.",
    },
    {
      title: "Multi-user collaboration with separate accounts",
      body: "Each family member can have their own RecipeSage account and still share recipes, meal plans, and shopping lists.",
    },
    {
      title: "Open source and self-hostable",
      body: "RecipeSage's code is on GitHub under the AGPL and you can run it on your own server. Flavorish is closed source and runs on its own cloud.",
    },
    {
      title: "Turn your collection into a printable cookbook",
      body: "RecipeSage's Cookbook Generator assembles your recipes into a single PDF, with a cover page, an optional table of contents, and each recipe on its own page with its image and nutrition. Flavorish has no built-in cookbook generator.",
    },
  ],
  competitorWins: [],
  migration: {
    headline: "Bringing your Flavorish recipes over",
    summary:
      "RecipeSage has a dedicated Flavorish importer. It accepts Flavorish's export, a .zip archive with a manifest, your recipe JSON files, and an images folder.",
    steps: [
      {
        body: "Open Flavorish and go to the Account tab.",
      },
      {
        body: "Under Import & Export, choose Export recipes.",
      },
      {
        body: "Save the .zip archive, which includes your recipes, images, and collections.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then Flavorish, and upload the .zip file you exported.",
      },
    ],
    docsUrl:
      "https://docs.recipesage.com/docs/tutorials/settings/import/flavorish/",
    docsLabel: "Read the full Flavorish import guide",
    importUrl: "/app/settings/import/flavorish",
  },
  faqs: [
    {
      q: "Is there a free alternative to Flavorish?",
      a: "Yes. RecipeSage is a free, open source alternative to Flavorish, with no paywall and no ads. You can import your recipes, plan meals, build shopping lists, track nutrition, and use it on the web, desktop, iOS, and Android. If you ever decide to leave, you can export everything or self-host.",
    },
    {
      q: "Will my Flavorish images come across?",
      a: "Yes. The Flavorish importer reads the images folder in your export and attaches each recipe's photo, and it falls back to the recipe's original image link if a file is missing.",
    },
    {
      q: "Does RecipeSage generate recipes with AI like Flavorish?",
      a: "Yes, RecipeSage has an assistant feature that can do this and is included for free.",
    },
  ],
  closing: [
    "If you want desktop, Windows, or Linux covered, want to import from PDFs and Word files, or want to share one library across separate family accounts without a subscription, that's where RecipeSage fits better. It's free, so there's no harm in trying it alongside Flavorish for a couple of weeks :)",
  ],
};
