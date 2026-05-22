import type { CompetitorData } from "./types";

export const copymethat: CompetitorData = {
  slug: "copymethat",
  name: "CopyMeThat",
  url: "https://www.copymethat.com/",
  tagline: "The free, open source CopyMeThat alternative",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. It runs in any browser, on iOS, and on Android, with no recipe cap and browser extension for grabbing recipes from any site.",
  cardSummary:
    "Web-clipper-first recipe app with a 40-recipe cap on the free tier.",
  intro: [
    "CopyMeThat is best known for its one-click web clipper. The free tier stops at 40 saved recipes. Past that, the paid tier is $1 per month, $12 per year, or $65 lifetime to remove the cap.",
    "My wife and I made RecipeSage as a free, open source alternative with no recipe limit. It has its own Firefox and Chrome clipper, plus auto-import from photos, PDFs, and Word docs, drag-and-drop meal planning, smart shopping lists, and nutrition tracking.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. Unlimited recipes, no ads, no subscription. Open source under the AGPL.",
    competitor:
      "Free up to 40 recipes. Premium is $1/month, $12/year, or $65 lifetime to lift the cap.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "Free up to 40 recipes, then paid",
    },
    { feature: "Web app", recipesage: true, competitor: true },
    { feature: "iOS app", recipesage: true, competitor: true },
    { feature: "Android app", recipesage: true, competitor: true },
    {
      feature: "Unlimited recipes on the free tier",
      recipesage: true,
      competitor: false,
      note: "CopyMeThat caps free accounts at 40 recipes.",
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
      competitor: false,
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
      feature: "Smart shopping list",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Editable aisle categorization",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Recipe scaling and unit conversion",
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
    },
    {
      feature: "Works offline",
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
      feature: "Data portability",
      recipesage: true,
      competitor: "HTML zip",
      note: "CopyMeThat exports an HTML zip. RecipeSage supports well-recognized standardized formats.",
    },
  ],
  whySwitch: [
    {
      title: "No 40-recipe cap",
      body: "Save 400 recipes, save 40,000. RecipeSage is free and does not cap. CopyMeThat's free tier stops at 40.",
    },
    {
      title: "More ways to import",
      body: "RecipeSage imports from URLs, photos, PDFs, Word docs, JSON-LD, and CSV. CopyMeThat's clipper is good for web pages but doesn't read photos, PDFs, or handwritten cards.",
    },
    {
      title: "Works offline",
      body: "RecipeSage works offline on web and mobile and syncs when you reconnect. CopyMeThat doesn't advertise an offline mode.",
    },
    {
      title: "Editable shopping list categories",
      body: "Rename, reorder, and delete aisle categories to match your store. CopyMeThat's defaults can't be edited.",
    },
    {
      title: "Built-in nutrition",
      body: "RecipeSage tracks macros, vitamins, and minerals per serving, and you can paste a nutrition label to auto-fill. CopyMeThat doesn't track nutrition.",
    },
    {
      title: "Open source",
      body: "RecipeSage's source is on GitHub under the AGPL. CopyMeThat is closed-source proprietary software.",
    },
  ],
  competitorWins: [],
  migration: {
    headline: "Bringing your CopyMeThat recipes over",
    summary:
      "RecipeSage has a dedicated CopyMeThat importer that preserves your content.",
    steps: [
      {
        body: "In CopyMeThat, open the More menu, choose Download Recipes, pick HTML, and click Download. You'll get a .zip file with an .html file and an images folder.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then CopyMeThat, and upload the .zip just as you downloaded it.",
      },
    ],
    docsUrl:
      "https://docs.recipesage.com/docs/tutorials/settings/import/copymethat/",
    docsLabel: "Read the full CopyMeThat import guide",
    importUrl: "/app/settings/import/copymethat",
  },
  faqs: [
    {
      q: "How is RecipeSage free when CopyMeThat caps the free tier at 40?",
      a: "RecipeSage is a side project from the two of us, not a business with employees and a marketing budget. Hosting is funded by donations and has been since 2018.",
    },
    {
      q: "Is RecipeSage's web clipper as good as CopyMeThat's?",
      a: "We believe it's as good or better. We use a number of strategies to pull the content from the target page. If you hit a page our parser struggles with, please tell us so we can fix it.",
    },
    {
      q: "Will my CopyMeThat images come through?",
      a: "Yes. The HTML zip from CopyMeThat includes an images folder, and our importer wires the photos to the right recipes.",
    },
    {
      q: "Will my recipes stay private?",
      a: "Yes. Saved recipes are private to your account by default. You can choose to share specific recipes publicly or with friends, but nothing is public unless you make it so.",
    },
  ],
  closing: [
    "If you've hit the CopyMeThat cap or you'd rather not pay to keep clipping, bring your CopyMeThat zip over and try RecipeSage. It's free so there's really no downside :)",
  ],
};
