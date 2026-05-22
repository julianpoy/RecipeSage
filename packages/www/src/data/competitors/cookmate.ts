import type { CompetitorData } from "./types";

export const cookmate: CompetitorData = {
  slug: "cookmate",
  name: "Cookmate",
  url: "https://www.cookmate.online/",
  tagline: "The free, open source Cookmate alternative",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. It runs in any browser, on iOS, and on Android, with no recipe cap and no ads inside your recipes.",
  cardSummary:
    "Free tier caps you at 60 cloud recipes and shows ads inside the recipe you're cooking.",
  intro: [
    "Cookmate (formerly My CookBook) is a recipe app with a cap of 60 cloud recipes and 1 shopping list, and shows ads inside recipes. Premium is $1.99 per month or $22.99 per year on iOS, or 20 EUR per year, which lifts the caps and removes ads.",
    "My wife and I made RecipeSage as a free, open source alternative with no recipe limit and no ads anywhere. It has its own Firefox and Chrome clipper, auto-import from photos, PDFs, and Word docs, drag-and-drop meal planning, a smart aisle-sorted shopping list, and nutrition tracking.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. Unlimited recipes, no ads, no subscription. Open source under the AGPL.",
    competitor:
      "Free up to 60 cloud recipes and 1 shopping list, with ads inside recipes. Premium is $1.99/month or $22.99/year on iOS, or 20 EUR/year.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "Free up to 60 recipes, then paid",
    },
    { feature: "Web app", recipesage: true, competitor: true },
    { feature: "iOS app", recipesage: "Free", competitor: "Paid" },
    { feature: "Android app", recipesage: "Free", competitor: "Paid" },
    {
      feature: "Unlimited recipes for free",
      recipesage: true,
      competitor: false,
      note: "Cookmate's free cloud is capped at 60 recipes.",
    },
    {
      feature: "Ad-free while cooking",
      recipesage: true,
      competitor: false,
      note: "Cookmate's free tier shows ads inside recipes.",
    },
    {
      feature: "Firefox and Chrome extension",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Auto import from any URL",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Import from a photo (OCR)",
      recipesage: true,
      competitor: "partial",
      note: "Cookmate's photo import counts against a 50/month AI credit pool on the free tier.",
    },
    {
      feature: "Import from PDF",
      recipesage: true,
      competitor: false,
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
      competitor: false,
    },
    {
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: false,
      note: "Cookmate's shopping list is a flat list with no aisle sorting and no automatic grouping.",
    },
    {
      feature: "Recipe scaling and unit conversion",
      recipesage: true,
      competitor: "partial",
      note: "Cookmate scaling is Premium-only and text-math, so 1 teaspoon times 50 becomes 50 teaspoons rather than a fraction of a cup.",
    },
    {
      feature: "Nutrition tracking (macros, vitamins, minerals)",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "AI cooking assistant",
      recipesage: true,
      competitor: "partial",
      note: "Cookmate has a ChatGPT recipe generator and image generator, but no equivalent cooking assistant.",
    },
    {
      feature: "Typo-tolerant search",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Real multi-user collaboration",
      recipesage: true,
      competitor: "partial",
      note: "Cookmate's friends feature is view-only between separate accounts. Shared cookbooks mean sharing one login.",
    },
    {
      feature: "Works offline",
      recipesage: true,
      competitor: "partial",
      note: "Cookmate's Android app works offline. The web app does not.",
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
      competitor: "partial",
      note: "Cookmate exports a proprietary .mcb ZIP. RecipeSage supports well-recognized standardized formats.",
    },
  ],
  whySwitch: [
    {
      title: "No 60-recipe cap",
      body: "Save 600 recipes, save 60,000. RecipeSage is free and does not cap. Cookmate's free cloud stops at 60 recipes and 1 shopping list.",
    },
    {
      title: "No ads while you cook",
      body: "RecipeSage never shows ads. Cookmate's free tier shows ads inside the recipe you're following.",
    },
    {
      title: "Built-in nutrition",
      body: "RecipeSage tracks macros, vitamins, and minerals per serving, and you can paste a nutrition label to auto-fill. Cookmate doesn't track nutrition at all.",
    },
    {
      title: "Aisle-sorted shopping list",
      body: "RecipeSage groups your list by aisle and you can rename, reorder, and delete categories to match your store. Cookmate's list is flat with no aisle sorting.",
    },
    {
      title: "Collaboration with separate accounts",
      body: "Each family member can have their own RecipeSage account and still share recipes, plans, and shopping lists. Cookmate's friends are view-only and shared cookbooks mean sharing one login.",
    },
  ],
  competitorWins: [
    {
      title: "Alexa and Google Assistant voice control",
      body: "Cookmate has a real Alexa skill and a Google Assistant action that read out ingredients and steps hands-free on Echo and Google Home. RecipeSage doesn't have native voice-assistant integrations.",
    },
  ],
  migration: {
    headline: "Bringing your Cookmate recipes over",
    summary:
      "RecipeSage has a dedicated Cookmate importer. The .mcb archive is a ZIP of XML plus image assets, so titles, ingredients, directions, source, notes, categories, and photos all come across.",
    steps: [
      {
        body: "In the Cookmate Android app, open the File Import/Export screen and export your cookbook as a .mcb archive. From the website, you can export from the same area in settings.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then Cookmate, and upload the .mcb file. The import runs as a background job and every imported recipe is tagged with a timestamped label so the batch is easy to review.",
      },
    ],
    docsUrl:
      "https://docs.recipesage.com/docs/tutorials/settings/import/cookmate/",
    docsLabel: "Read the full Cookmate import guide",
    importUrl: "/app/settings/import/cookmate",
  },
  faqs: [
    {
      q: "How is RecipeSage free when Cookmate caps the free tier at 60?",
      a: "RecipeSage is a side project from the two of us, not a business with employees and a marketing budget. Hosting is funded by optional donations and has been since 2018.",
    },
    {
      q: "Will my Cookmate photos come through?",
      a: "Yes. The .mcb archive is a ZIP of XML plus image assets.",
    },
    {
      q: "I have a Cookmate Premium subscription. Is it worth switching?",
      a: "That's your call. $1.99/month isn't nothing! If you want nutrition tracking, an aisle-sorted shopping list, recurring meal plans, or separate accounts for each family member, RecipeSage covers those at no cost.",
    },
  ],
  closing: [
    "If you've hit the 60-recipe cap, or you'd rather not see ads inside the recipe you're cooking, bring your .mcb over and try RecipeSage. It's free, so there's really no downside :)",
  ],
};
