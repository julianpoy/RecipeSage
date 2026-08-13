import type { CompetitorData } from "./types";

export const cookbookmanager: CompetitorData = {
  slug: "cookbookmanager",
  name: "CookBookManager",
  url: "https://cookbookmanager.com/",
  tagline: "The free, open source CookBookManager alternative",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. It runs in any browser, on iOS, on Android, and as native desktop apps for Windows, macOS, and Linux, with no recipe cap and no subscription, and we'll import your CookBookManager library in a few clicks.",
  seoDescription:
    "A free, open source alternative to CookBookManager (CookBook: Recipe Keeper). RecipeSage keeps the recipes you actually saved, with no 20-recipe cap and no subscription, on web, desktop, iOS, and Android.",
  cardSummary:
    "A cloud recipe app that caps the free tier at 20 recipes, with unlimited use behind a $39.99+/year subscription.",
  intro: [
    "CookBookManager, branded CookBook: Recipe Keeper at cookbookmanager.com, is a cloud recipe app for iOS, Android, and the web. The free plan stops at 20 saved recipes, and unlimited recipes and imports require CookBook Pro at $39.99 per year direct, or $49.99 per year through the App Store.",
    "My wife and I made RecipeSage as a free, open source alternative with no recipe cap and no subscription. It runs in any browser, on iOS, on Android, and as native desktop apps for Windows, macOS, and Linux. We added a dedicated CookBookManager importer so you can bring your whole library over.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. Unlimited recipes, no ads, no paywall. Open source under the AGPL.",
    competitor:
      "Free up to 20 recipes. CookBook Pro is $6.99/month or $39.99/year direct with a 14-day trial, or $9.99/month and $49.99/year via the App Store.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "Free up to 20 recipes, then $39.99 to $49.99/year",
    },
    {
      feature: "Unlimited recipes on the free tier",
      recipesage: true,
      competitor: false,
      note: "CookBookManager's free plan caps you at 20 saved recipes. Unlimited recipes require CookBook Pro.",
    },
    { feature: "Ad-free", recipesage: true, competitor: true },
    { feature: "Web app", recipesage: true, competitor: true },
    { feature: "iOS app", recipesage: true, competitor: true },
    { feature: "Android app", recipesage: true, competitor: true },
    {
      feature: "Native desktop app (Windows, macOS, Linux)",
      recipesage: true,
      competitor: false,
      note: "RecipeSage has native desktop apps for Windows, macOS, and Linux. On the desktop CookBookManager is the web app only, and its Mac build is the iPad app running on Apple Silicon, with no Windows or Linux app.",
    },
    {
      feature: "Firefox and Chrome extension",
      recipesage: true,
      competitor: "partial",
      note: "CookBookManager has a Chrome extension. RecipeSage's Clip Tool works in both Firefox and Chrome.",
    },
    { feature: "Auto import from a URL", recipesage: true, competitor: true },
    {
      feature: "Import from a photo (OCR)",
      recipesage: true,
      competitor: true,
      note: "CookBookManager scans photos with AI. RecipeSage imports from a photo of a cookbook page or handwritten card.",
    },
    {
      feature: "Import from PDF, Word, and text documents",
      recipesage: true,
      competitor: "partial",
      note: "CookBookManager imports from PDF files. Word and text-document import isn't documented. RecipeSage imports PDF, Word, and text files.",
    },
    {
      feature: "Import from social media (Instagram, TikTok, and more)",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Drag-and-drop meal planner",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Nutrition tracking (macros, vitamins, minerals)",
      recipesage: true,
      competitor: "partial",
      note: "CookBookManager tracks calories, protein, carbs, and fat. RecipeSage adds vitamins and minerals and can auto-fill from a pasted nutrition label.",
    },
    {
      feature: "Recipe scaling and unit conversion",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Built-in kitchen toolkit",
      recipesage: true,
      competitor: "partial",
      note: "CookBookManager converts units and has a nutrition calculator. RecipeSage's toolkit adds a pan and bakeware converter that suggests bake time and temperature and a cooking-temperature reference for safe internal temperatures.",
    },
    {
      feature: "Cook Mode (full-screen, distraction-free cooking view)",
      recipesage: true,
      competitor: true,
      note: "Both keep the screen awake with a large font and step check-off. CookBookManager adds voice control. RecipeSage shows the ingredients and steps together and scales servings on the fly.",
    },
    {
      feature: "AI cooking assistant",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Typo-tolerant search",
      recipesage: true,
      competitor: "partial",
      note: "CookBookManager has advanced search and filters. Whether its search is typo-tolerant isn't documented. RecipeSage's search tolerates typos.",
    },
    {
      feature: "Real multi-user collaboration",
      recipesage: true,
      competitor: false,
      note: "CookBookManager families share a single account. RecipeSage gives each person their own account and still shares recipes, meal plans, and shopping lists.",
    },
    {
      feature: "Works offline",
      recipesage: true,
      competitor: "partial",
      note: "CookBookManager's mobile apps work offline. Offline support for its web app isn't documented. RecipeSage works offline on web and mobile.",
    },
    { feature: "Open source", recipesage: true, competitor: false },
    { feature: "Self-hostable", recipesage: true, competitor: false },
    {
      feature: "Data portability",
      recipesage: true,
      competitor: "partial",
      note: "CookBookManager exports a .zip, but its recipe images are linked to CookBook's servers rather than embedded, so they can break after you leave. RecipeSage exports standard formats with your images included.",
    },
    {
      feature: "Public sharing by link or embed, no account needed",
      recipesage: true,
      competitor: false,
      note: "RecipeSage gives you a public profile to share a recipe, a label, or your whole collection by link, plus website embed codes. CookBookManager keeps your library private, with no public profile or embed.",
    },
    {
      feature: "Printable PDF cookbook generator",
      recipesage: true,
      competitor: false,
      note: "CookBookManager can print or PDF an individual recipe. RecipeSage's Cookbook Generator compiles your whole collection into one printable PDF with a cover page, optional table of contents, and each recipe on its own page.",
    },
    { feature: "Actively developed", recipesage: true, competitor: true },
  ],
  whySwitch: [
    {
      title: "No 20-recipe cap and no subscription",
      body: "RecipeSage is free and never caps your library. CookBookManager's free plan stops at 20 recipes, and unlimited recipes, imports, and AI features require CookBook Pro at $39.99 to $49.99 per year.",
    },
    {
      title: "Native apps on every desktop",
      body: "RecipeSage has native desktop apps for Windows, macOS, and Linux, plus the web app. On the desktop CookBookManager is web-only, and its Mac build is the iPad app on Apple Silicon, with no Windows or Linux app.",
    },
    {
      title: "Open source and truly portable",
      body: "RecipeSage is open source, self-hostable, and exports your full library in standard formats with your images included. CookBookManager is closed source, and its export links to images on CookBook's servers rather than embedding them, so those images can disappear after you leave.",
    },
    {
      title: "Deeper nutrition",
      body: "RecipeSage tracks macros, vitamins, and minerals per serving, and you can paste a nutrition label to auto-fill. CookBookManager tracks calories, protein, carbs, and fat.",
    },
    {
      title: "Collaboration with separate accounts",
      body: "Each person can have their own RecipeSage account and still share recipes, meal plans, and shopping lists. CookBookManager families share one login.",
    },
    {
      title: "Share your recipes with anyone",
      body: "RecipeSage gives you a public profile to share a single recipe, a whole label, or your entire collection by a link anyone can open without an account, plus embed codes for a website or blog. CookBookManager keeps your library private.",
    },
    {
      title: "Turn your collection into a printable cookbook",
      body: "RecipeSage's Cookbook Generator assembles your recipes into a single PDF, with a cover page, an optional table of contents, and each recipe on its own page with its image and nutrition. CookBookManager can print or PDF one recipe at a time but has no cookbook generator.",
    },
  ],
  competitorWins: [
    {
      title: "Voice control in cook mode",
      body: "CookBookManager's cooking mode responds to voice commands like 'Next' or 'Complete onion', so you can move through a recipe without touching the screen. RecipeSage's Cook Mode is on-device but not voice-controlled.",
    },
    {
      title: "AI recipe and image generation",
      body: "If you want an app to invent new recipes and dish photos for you, CookBookManager's AI Chef is built for that. RecipeSage deliberately focuses on keeping and cooking the real recipes you save rather than generating them.",
    },
  ],
  migration: {
    headline: "Bringing your CookBookManager recipes over",
    summary:
      "RecipeSage has a dedicated CookBookManager importer. It accepts CookBookManager's export, a .zip archive with one .yml file per recipe.",
    steps: [
      {
        body: "In CookBookManager (CookBook), open the side menu, then Settings, and find the backup or export recipes option.",
      },
      {
        body: "Choose the export that produces a .zip archive of your recipes.",
      },
      {
        body: "Save the .zip file.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then CookBookManager, and upload the .zip file you exported.",
      },
    ],
    docsUrl:
      "https://docs.recipesage.com/docs/tutorials/settings/import/cookbookmanagercom/",
    docsLabel: "Read the full CookBookManager import guide",
    importUrl: "/app/settings/import/cookbookmanagercom",
    note: "CookBookManager stores recipe images on its own servers and its export links to them rather than embedding them. Import your recipes into RecipeSage while your CookBookManager account is still active so the images are still reachable.",
  },
  faqs: [
    {
      q: "Is there a free alternative to CookBook / CookBookManager?",
      a: "Yes. RecipeSage is a free, open source alternative to CookBookManager (CookBook: Recipe Keeper), with no paywall, no ads, and no 20-recipe cap. You can import your recipes, plan meals, build shopping lists, track nutrition, and use it on the web, desktop, iOS, and Android. If you ever decide to leave, you can export everything or self-host.",
    },
    {
      q: "Will my CookBookManager recipes and their images come across?",
      a: "Your recipes come across in full through the dedicated importer. CookBookManager's export links to images on its own servers rather than embedding them, so import into RecipeSage while your CookBookManager account is still active, so those images are still reachable.",
    },
    {
      q: "Can I use RecipeSage on Windows or Linux?",
      a: "Yes. RecipeSage has native desktop apps for Windows, macOS, and Linux, plus the web app in any browser. On the desktop CookBookManager is the web app only, with no Windows or Linux app.",
    },
    {
      q: "Do I lose access to my recipes after 20 like CookBookManager's free plan?",
      a: "No. RecipeSage is free with no recipe cap. Save 20 recipes or 20,000. CookBookManager's free plan stops at 20 saved recipes, and lifting that requires a paid CookBook Pro subscription.",
    },
  ],
  closing: [
    "If you'd rather keep the real recipes you've collected, without a 20-recipe cap, a subscription, or AI-generated filler, RecipeSage will import your CookBookManager library and give it a free, open home. It costs nothing to try.",
  ],
};
