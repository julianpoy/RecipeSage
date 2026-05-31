import type { CompetitorData } from "./types";

export const pepperplate: CompetitorData = {
  slug: "pepperplate",
  name: "Pepperplate",
  url: "https://www.pepperplate.com/",
  tagline: "A free, open source Pepperplate alternative",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. It runs in any browser, on iOS, and on Android, and we'll move your Pepperplate library over in one click.",
  seoDescription:
    "A free, open source Pepperplate alternative. RecipeSage imports recipes, plans meals, and builds shopping lists across web, iOS, and Android. Always free.",
  cardSummary:
    "Still charges $33 per year, but the iOS app hasn't shipped an update since April 2023.",
  intro: [
    "Pepperplate switched to a paid subscription in January 2020 ($2.99 per month or $32.99 per year). The iOS app hasn't shipped an update since April 2023, the App Store rating has dropped to around 2.9, and many users describe the product as no longer actively developed.",
    "My wife and I made RecipeSage as a free, open source replacement. We added a Pepperplate importer specifically because people kept asking for a way out. It signs in to Pepperplate on your behalf and pulls every recipe with images and structured fields. You don't need an active Pepperplate subscription to use it.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever, open source, actively maintained. No ads, no subscription.",
    competitor:
      "$2.99 per month or $32.99 per year. The iOS app has not received an update since April 2023.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "$33 per year",
    },
    { feature: "Web app", recipesage: true, competitor: true },
    {
      feature: "iOS app",
      recipesage: true,
      competitor: "partial",
      note: "Pepperplate iOS app last updated April 2023.",
    },
    {
      feature: "Android app",
      recipesage: true,
      competitor: "partial",
    },
    {
      feature: "Actively developed",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Auto import from a URL",
      recipesage: true,
      competitor: "partial",
      note: "Pepperplate imports from a limited set of supported sites. RecipeSage's URL importer covers a wider range.",
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
      feature: "Firefox and Chrome extension",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Drag-and-drop meal planner",
      recipesage: true,
      competitor: "partial",
    },
    {
      feature: "Recurring meal plan items",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: "partial",
    },
    {
      feature: "Nutrition tracking",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Typo-tolerant search",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Real collaboration with named users",
      recipesage: true,
      competitor: false,
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
      feature: "Data portability",
      recipesage: true,
      competitor: "Plain .txt",
      note: "Pepperplate's only export is unstructured plain text that other apps can't reliably re-import. RecipeSage supports well-recognized standardized formats.",
    },
    {
      feature: "Public sharing by link or embed, no account needed",
      recipesage: true,
      competitor: false,
      note: "RecipeSage gives you a public profile to share a recipe, a label, or your whole collection by link, plus website embed codes. Pepperplate shares one recipe at a time by email or social post, with no public profile or embed.",
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
      title: "Your recipes belong to you",
      body: "Pepperplate's only export is a .zip of plain text files that other apps can't reliably re-import. RecipeSage exports JSON-LD, PDF, or text any time.",
    },
    {
      title: "Stop paying for an unmaintained app",
      body: "Pepperplate charges $2.99/month or $32.99/year for an app that hasn't shipped an update in years. RecipeSage is free and actively maintained.",
    },
    {
      title: "One-click migration, no Pepperplate subscription needed",
      body: "RecipeSage signs in to Pepperplate on your behalf and pulls every recipe with images, ingredients, instructions, and metadata. Your credentials are used only for the fetch and aren't stored.",
    },
    {
      title: "A modern feature set",
      body: "URL, photo, PDF, and Word-doc import. Drag-and-drop and recurring meal plans. Auto-categorized shopping lists. Typo-tolerant search. Nutrition. A Firefox and Chrome extension. None of these are in Pepperplate.",
    },
    {
      title: "Future-proof and self-hostable",
      body: "RecipeSage is open source and can be self-hosted, so it'll be here for years to come with a community of open-source support backing it.",
    },
    {
      title: "Turn your collection into a printable cookbook",
      body: "RecipeSage's Cookbook Generator assembles your recipes into a single PDF, with a cover page, an optional table of contents, and each recipe on its own page with its image and nutrition. It's an easy way to print a personal cookbook or give one as a gift. Pepperplate has no built-in cookbook generator.",
    },
  ],
  competitorWins: [
    {
      title: "Setting timers in-app",
      body: "Pepperplate's iOS Cook Mode supports setting timers in-app. RecipeSage doesn't support timers at the moment.",
    },
    {
      title: "Reusable Menus bundles",
      body: "Pepperplate's Menus, a saved bundle of recipes for a dinner party or holiday, was a feature long-time users specifically miss. RecipeSage has meal plans and labels that cover similar ground, but not in a single Menus concept.",
    },
  ],
  migration: {
    headline: "Bringing your Pepperplate recipes over in one click",
    summary:
      "RecipeSage signs in to Pepperplate for you, fetches every recipe with images and structured fields, and imports them into your RecipeSage account. No active Pepperplate subscription required.",
    steps: [
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "Open Settings then Import then Pepperplate, and enter your Pepperplate email and password.",
      },
      {
        body: "RecipeSage signs in on your behalf, pulls every recipe (titles, ingredients, instructions, images, tags), and imports them as a background job. Your credentials are used only for the fetch and aren't stored.",
      },
      {
        body: "Every imported recipe is tagged with a timestamped label so the batch is easy to review or undo.",
      },
    ],
    docsUrl:
      "https://docs.recipesage.com/docs/tutorials/settings/import/pepperplate/",
    docsLabel: "Read the full Pepperplate import guide",
    importUrl: "/app/settings/import/pepperplate",
    note: "We don't use Pepperplate's .txt export because the format is too unstructured to rebuild fields cleanly. Logging in on your behalf gives a much better result.",
  },
  faqs: [
    {
      q: "Is Pepperplate shutting down?",
      a: "Not officially. The website is still live and subscriptions are still on sale. But the iOS app hasn't shipped an update in years and the App Store rating has dropped, so we'd rather have your recipes somewhere actively maintained.",
    },
    {
      q: "Will I lose my recipe categories and notes?",
      a: "No. The Pepperplate importer pulls structured fields including titles, ingredients, instructions, images, source URLs, notes, and tags. Pepperplate tags become RecipeSage labels.",
    },
    {
      q: "Why doesn't RecipeSage just use Pepperplate's export file?",
      a: "Pepperplate's only export is a .zip of plain text files, which other apps can't reliably parse into structured fields. Signing in on your behalf gives a much cleaner import.",
    },
    {
      q: "Is it safe to give RecipeSage my Pepperplate password?",
      a: "We use the credentials only for the one-time fetch and never store them. The whole import runs server-side as a background job and you can review every imported recipe afterwards. You can also change your Pepperplate password after the import if you'd like.",
    },
    {
      q: "Will my meal plan come across?",
      a: "Recipe data comes across in full. Meal plan history doesn't come through, but you can rebuild your upcoming meal plan in RecipeSage in a few minutes using the drag-and-drop calendar.",
    },
    {
      q: "Is there a free alternative to Pepperplate?",
      a: "Yes. RecipeSage is a free, open source alternative to Pepperplate, with no subscription and no ads. You can import your recipes, plan meals, build shopping lists, track nutrition, and use it on the web, iOS, and Android. If you ever decide to leave, you can export everything or self-host.",
    },
  ],
  closing: [
    "If you're tired of paying for software that hasn't moved in years, RecipeSage will move your recipes over for you and give them an actively maintained home. It costs nothing to try.",
  ],
};
