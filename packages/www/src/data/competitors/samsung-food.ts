import type { CompetitorData } from "./types";

export const samsungFood: CompetitorData = {
  slug: "samsung-food",
  name: "Samsung Food",
  url: "https://samsungfood.com/",
  tagline: "The free, open source Samsung Food alternative",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. It runs in any browser, on iOS, and on Android, with no Samsung account required.",
  seoDescription:
    "A Samsung Food alternative with no ads and no Samsung account. RecipeSage is free, open source, with photo import, meal planning, and nutrition. Always free.",
  cardSummary:
    "Whisk after Samsung's 2019 acquisition. Best features need Samsung Food+ or Samsung hardware.",
  intro: [
    "Whisk was an independent recipe app from 2012. Samsung acquired it in 2019 and rebranded it Samsung Food on August 30, 2023. The free tier exists, but photo scanning, AI meal plans, Smart Cook Mode, Vision AI ingredient scanning, and ad removal all sit behind Samsung Food+ at $6.99 per month or $59.99 per year. The deepest features expect a Samsung Account and ideally a Samsung Family Hub fridge.",
    "My wife and I made RecipeSage as a free, open source alternative with no ads and no Samsung lock-in. Photo and PDF import, drag-and-drop meal planning, smart shopping lists, recipe scaling, and typo-tolerant search are all free.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. No ads, no Samsung account, no subscription tier. Open source under the AGPL.",
    competitor:
      "Free tier with ads. Samsung Food+ is $6.99/month or $59.99/year. Several core features require Samsung Food+.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "Free with ads, or $59.99/year for Samsung Food+",
    },
    {
      feature: "Completely ad-free",
      recipesage: true,
      competitor: false,
      note: "Samsung Food+ removes ads as a paid feature.",
    },
    {
      feature: "Made by a small independent team",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "No Samsung account required",
      recipesage: true,
      competitor: "partial",
      note: "Basic Samsung Food use works without a Samsung Account, but deeper features require linking one.",
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
      feature: "Free import from a photo (OCR)",
      recipesage: true,
      competitor: false,
      note: "Photo recipe scanning is a Samsung Food+ feature.",
    },
    {
      feature: "Import from PDF and Word documents",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Data portability",
      recipesage: true,
      competitor: false,
      note: "Samsung Food has no bulk export. RecipeSage supports well-recognized standardized formats.",
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
      feature: "Nutrition tracking (macros, vitamins, minerals)",
      recipesage: true,
      competitor: "partial",
    },
    {
      feature: "AI cooking assistant",
      recipesage: true,
      competitor: "partial",
      note: "Samsung Food has AI features but most require Samsung Food+.",
    },
    {
      feature: "Typo-tolerant search of your personal recipes",
      recipesage: true,
      competitor: false,
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
      feature: "Content license after account deletion",
      recipesage: "Ends with your account",
      competitor: "Survives account deletion",
      note: "Samsung's Terms grant Samsung a continuing content license that survives account deletion. See RecipeSage's legal page for our terms.",
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
      title: "Made by two people, not a hardware company",
      body: "RecipeSage is built and run by a small team of two, not folded into a smart-appliance ecosystem.",
    },
    {
      title: "No ads, no continuing content license",
      body: "RecipeSage doesn't run ads and doesn't claim a content license that outlives your account. Samsung Food's terms grant a continuing license that survives account deletion.",
    },
    {
      title: "No Samsung lock-in",
      body: "Full features without buying a Family Hub fridge, without linking a Samsung Account, and without Samsung Health profile data shaping your meal plan.",
    },
    {
      title: "Real data ownership",
      body: "RecipeSage is open source, and lets you actually export your recipes. Samsung Food has no bulk export.",
    },
    {
      title: "Premium features without a premium tier",
      body: "Photo and PDF import, drag-and-drop meal planning, smart shopping lists, recipe scaling, and typo-tolerant search are all in RecipeSage for free. Most of those require Samsung Food+ at $59.99/year.",
    },
    {
      title: "Turn your collection into a printable cookbook",
      body: "RecipeSage's Cookbook Generator assembles your recipes into a single PDF, with a cover page, an optional table of contents, and each recipe on its own page with its image and nutrition. It's an easy way to print a personal cookbook or give one as a gift. Samsung Food has no built-in cookbook generator.",
    },
  ],
  competitorWins: [
    {
      title: "Samsung smart-appliance integration",
      body: "If you own a Samsung Family Hub fridge, Bespoke oven, or cooktop, Samsung Food integrates directly with the hardware: fridge inventory, cook-setting handoff, and grocery ordering from the fridge. We don't.",
    },
    {
      title: "First-party recipe catalog",
      body: "Samsung Food inherited Whisk's social Communities layer with creator follows and a larger built-in recipe catalog. RecipeSage is a personal keeper, not a recipe network.",
    },
  ],
  migration: {
    headline: "Bringing your Samsung Food recipes over",
    summary:
      "Samsung Food doesn't offer a bulk export, but the RecipeSage Clip Tool browser extension makes the move about two clicks per recipe.",
    steps: [
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "Install the free RecipeSage Clip Tool extension for Firefox or Chrome.",
      },
      {
        body: "Sign in to Samsung Food in the same browser, open a saved recipe, and click the RecipeSage extension icon to import it. About two clicks per recipe. Repeat for each one you want to bring over.",
      },
      {
        body: "Imported recipes land in your RecipeSage account tagged with an import label so the batch is easy to review.",
      },
    ],
    note: "Some Samsung Food recipes link back to the original source rather than storing full instructions. For those, importing the original recipe URL into RecipeSage's URL importer gives a more complete result.",
  },
  faqs: [
    {
      q: "Why does it matter that Samsung owns Whisk?",
      a: "If you don't mind, you don't have to switch. Some people are uncomfortable with their recipe data and shopping habits flowing into a large company's product ecosystem, especially when their terms grant a content license that continues after account deletion. RecipeSage is built for people who'd rather their recipes stay private and their own.",
    },
    {
      q: "What about Samsung Food's calorie tracker?",
      a: "RecipeSage has built-in nutrition tracking with macros, vitamins, and minerals per serving, and you can auto-fill from a nutrition label. It's not a full diet-tracking app, but it covers what most cooks need.",
    },
    {
      q: "Is there a free alternative to Samsung Food?",
      a: "Yes. RecipeSage is a free, open source alternative to Samsung Food, with no subscription and no ads. You can import your recipes, plan meals, build shopping lists, track nutrition, and use it on the web, iOS, and Android. If you ever decide to leave, you can export everything or self-host.",
    },
  ],
  closing: [
    "If Samsung's smart-fridge ecosystem is the entire reason you use Samsung Food, stick with it. If you mostly want a recipe app that doesn't lock you into a hardware brand, RecipeSage was made for that. Plus, RecipeSage is free so there's no harm in trying it :)",
  ],
};
