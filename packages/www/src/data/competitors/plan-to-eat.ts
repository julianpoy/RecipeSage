import type { CompetitorData } from "./types";

export const planToEat: CompetitorData = {
  slug: "plan-to-eat",
  name: "Plan to Eat",
  url: "https://www.plantoeat.com/",
  tagline: "The free, open source Plan to Eat alternative",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. It runs in any browser, on iOS, and on Android, with no subscription and no time limit.",
  cardSummary:
    "A $49 to $54.99 per year meal-planning subscription with no free tier.",
  intro: [
    "Plan to Eat is a meal-planning subscription from an independent team in Colorado. It costs $49 per year direct, or $54.99 per year through the Apple App Store, after a 14-day trial. There is no free tier.",
    "My wife and I made RecipeSage as a free, open source alternative. Drag-and-drop meal planning, recipe organization, smart shopping lists, photo and PDF import, and nutrition tracking are all included at no cost.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. No subscription, no ads. Unlimited recipes, meal planning, and shopping lists for every account.",
    competitor:
      "$5.95 per month or $49 per year direct (USD). $54.99 per year on the iOS App Store. 14-day free trial, then paid. No free tier.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "$49 to $54.99 per year",
    },
    { feature: "Web app", recipesage: true, competitor: true },
    { feature: "iOS app", recipesage: "Free", competitor: "Subscription" },
    { feature: "Android app", recipesage: "Free", competitor: "Subscription" },
    {
      feature: "Browser extension (Firefox, Chrome)",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Auto import from a URL",
      recipesage: true,
      competitor: true,
      note: "RecipeSage's URL importer supports a wider range of recipe sites.",
    },
    {
      feature: "Import from a photo (OCR)",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "PDF import",
      recipesage: true,
      competitor: "partial",
      note: "Plan to Eat supports adding PDFs one at a time, but not in bulk.",
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
      competitor: true,
    },
    {
      feature: "Reusable meal-plan templates",
      recipesage: "partial",
      competitor: true,
      note: "Plan to Eat's Menus feature is more developed than RecipeSage's equivalent.",
    },
    {
      feature: "Freezer / batch-cooking tracker",
      recipesage: false,
      competitor: true,
    },
    {
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Recipe scaling and unit conversion",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Nutrition tracking (macros, vitamins, minerals)",
      recipesage: true,
      competitor: "partial",
      note: "Plan to Eat focuses on macros; vitamin and mineral depth is less documented.",
    },
    {
      feature: "AI cooking assistant",
      recipesage: true,
      competitor: "partial",
      note: "Plan to Eat has AI substitution suggestions but that's it.",
    },
    {
      feature: "Typo-tolerant search",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Real multi-user collaboration",
      recipesage: true,
      competitor: false,
      note: "Plan to Eat's family sharing means sharing one login.",
    },
    { feature: "Works offline", recipesage: true, competitor: true },
    { feature: "Open source", recipesage: true, competitor: false },
    { feature: "Self-hostable", recipesage: true, competitor: false },
    {
      feature: "Data portability",
      recipesage: true,
      competitor: "CSV export",
      note: "Plan to Eat lets you export your recipe book to CSV from the website, even after a subscription lapses. RecipeSage supports well-recognized standardized formats.",
    },
  ],
  whySwitch: [
    {
      title: "No subscription",
      body: "RecipeSage is free, with no recurring bill and no time-limited trial. Plan to Eat is $49 to $54.99 per year with a 14-day trial.",
    },
    {
      title: "More import options",
      body: "RecipeSage imports from URLs, photos, PDFs, and Word docs. Plan to Eat covers URLs and photos and adds PDFs one at a time.",
    },
    {
      title: "Deeper nutrition data",
      body: "RecipeSage tracks macros, vitamins, and minerals per serving, with auto-fill from a nutrition label.",
    },
    {
      title: "Typo-tolerant search",
      body: "Search 'pankakes' and find your pancake recipe, or find that one recipe where you mistyped \"asparaggus\". Plan to Eat's search requires exact matches.",
    },
    {
      title: "Collaboration with separate accounts",
      body: "Each family member can have their own RecipeSage account and still share recipes, plans, and shopping lists. Plan to Eat's family sharing means using the same login.",
    },
  ],
  competitorWins: [
    {
      title: "Reusable Menus templates",
      body: "Plan to Eat's Menus (saved templates of recipes and notes) is more developed than RecipeSage's equivalents today.",
    },
    {
      title: "Freezer and batch-cooking tracker",
      body: "Plan to Eat has a dedicated Freezer feature for tracking frozen meals with date frozen and servings. RecipeSage doesn't have a direct equivalent.",
    },
  ],
  migration: {
    headline: "Bringing your Plan to Eat recipes over",
    summary:
      "RecipeSage lists Plan to Eat as a supported migration source. You can export your recipe book from Plan to Eat in minutes and import it into RecipeSage, even if your Plan to Eat subscription has lapsed.",
    steps: [
      {
        body: "From the Plan to Eat website, open Settings then Account, scroll to Export, and choose Export to CSV. You'll get a single CSV with all of your recipes.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then CSV, and upload the file Plan to Eat gave you.",
      },
      {
        body: "Tags, ratings, course, cuisine, and main-ingredient fields map across to RecipeSage labels.",
      },
    ],
    importUrl: "/app/settings/import/csv",
    note: "Plan to Eat lets you export even after a subscription ends, so nothing is locked up if you change your mind later.",
  },
  faqs: [
    {
      q: "How can you offer this for free when Plan to Eat charges $49 a year?",
      a: "Plan to Eat has a team they need to pay. RecipeSage is a side project for the two of us. Hosting is funded by optional donations and has been since 2018.",
    },
    {
      q: "Will I lose my meal plans when I switch?",
      a: "Plan to Eat's export covers recipes, not meal plans. You'll need to rebuild your upcoming meal plan in RecipeSage, but drag-and-drop makes that quick.",
    },
    {
      q: "Is RecipeSage's meal planner as capable as Plan to Eat's?",
      a: "Plan to Eat's Menus templates and freezer tracker are more developed than ours. RecipeSage covers the meal-planning basics (drag and drop, recurring, scaling, shopping list integration) and adds things Plan to Eat doesn't, like photo and PDF import and deeper nutrition.",
    },
    {
      q: "What happens to my recipes if RecipeSage shuts down?",
      a: "You can export everything to JSON-LD, PDF, or text any time. Because we're open source, anyone can keep running the code, including on your own server. We've been doing this since 2018 with no plans to stop anytime soon.",
    },
  ],
  closing: [
    "If you'd rather not pay a yearly subscription for meal planning, give RecipeSage a few weeks in your kitchen. It's free, so there's really no downside :)",
  ],
};
