import type { CompetitorData } from "./types";

export const evernote: CompetitorData = {
  slug: "evernote",
  name: "Evernote",
  url: "https://evernote.com/",
  tagline: "Move your recipe notes into an app built for recipes",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. If you've been keeping recipes in Evernote notes, we'll import your .enex export and give your collection structured ingredients, automatic shopping lists, scaling, and nutrition.",
  cardSummary:
    "Great note app, not a recipe app. The free tier now caps at 50 notes total, and renewal prices have jumped roughly 70%.",
  intro: [
    "Evernote is a general-purpose note-taking app. Saving recipes in Evernote notes (typed in, clipped from blogs, or photographed from cookbooks) has been one of the most common home-cook patterns for over a decade, and Evernote Food shutting down in 2015 left those users on the regular note app. Since the Bending Spoons takeover in January 2023, the free plan has been capped at 50 notes total on 1 device (December 2023), and long-time paid customers have widely reported renewal increases of around 70% or more.",
    "My wife and I made RecipeSage as a real recipe app for people in exactly this spot. Notes apps can hold the words of a recipe, but the things home cooks actually want (a shopping list that combines garlic from three recipes, a drag-and-drop weekly plan, 2x scaling, nutrition per serving) only work when ingredients live in structured fields. RecipeSage has a one-click `.enex` importer so your existing Evernote recipes come over without retyping.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. No subscription, no ads, no per-device fees, no note caps, and no selling your data.",
    competitor:
      "Free plan capped at 50 notes total on 1 device. Starter around $99/year, Advanced around $250/year, with sizeable renewal increases reported since 2024.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "Free up to 50 notes, then $99-$250/year",
    },
    {
      feature: "Free-tier capacity",
      recipesage: "Unlimited recipes",
      competitor: "50 notes total, 1 notebook, 1 device",
      note: "Free Evernote was capped at 50 notes and 1 notebook in December 2023, and limited to 1 connected device.",
    },
    { feature: "Web app", recipesage: true, competitor: true },
    { feature: "iOS app", recipesage: true, competitor: true },
    { feature: "Android app", recipesage: true, competitor: true },
    {
      feature: "Firefox and Chrome extension",
      recipesage: true,
      competitor: true,
      note: "Evernote's Web Clipper saves the full web page. RecipeSage's clipper parses the page into a structured recipe with ingredients and steps.",
    },
    {
      feature: "Auto import recipes from a URL",
      recipesage: true,
      competitor: false,
      note: "Evernote isn't designed for recipe parsing. The Web Clipper can save the page, but it doesn't break it into ingredients, directions, yield, or times.",
    },
    {
      feature: "Import recipes from a photo (OCR)",
      recipesage: true,
      competitor: "partial",
      note: "Evernote's mobile scanner OCRs text in an image, but the result is a free-form note. RecipeSage's photo import parses it into a recipe with structured fields.",
    },
    {
      feature: "Import recipes from PDF and Word documents",
      recipesage: true,
      competitor: false,
      note: "Evernote can attach files to a note, but it doesn't read them as recipes.",
    },
    {
      feature: "Structured ingredient fields",
      recipesage: true,
      competitor: false,
      note: "Evernote stores recipes as free text inside a note. RecipeSage parses ingredients into quantity, unit, and item, which is what unlocks shopping lists, scaling, and nutrition.",
    },
    {
      feature: "Drag-and-drop meal planner",
      recipesage: true,
      competitor: false,
      note: "Evernote isn't designed for meal planning. People type meals into a table-shaped note, or paste note links into Google Calendar events.",
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
      note: "Evernote shopping lists are a manually maintained note with checkboxes. No ingredient consolidation across recipes, no aisle grouping, no per-recipe add-to-list.",
    },
    {
      feature: "Recipe scaling and unit conversion",
      recipesage: true,
      competitor: false,
      note: "Evernote doesn't know an ingredient from a paragraph, so it can't rescale quantities.",
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
      note: "Evernote v11 added a general AI Assistant and semantic search over your notes. They aren't recipe-aware, so there's no scaling, no shopping-list generation, and no cooking mode.",
    },
    {
      feature: "Typo-tolerant search",
      recipesage: true,
      competitor: "partial",
      note: "Evernote's classic search is keyword/operator based. Semantic search exists on paid plans but isn't ingredient-aware.",
    },
    {
      feature: "Real collaboration with separate accounts",
      recipesage: true,
      competitor: true,
      note: "Evernote does proper multi-user sharing of notes and notebooks, but free users are capped at 1 device, which makes household use without paying impractical.",
    },
    {
      feature: "Works offline",
      recipesage: true,
      competitor: "partial",
      note: "Evernote desktop apps work offline. Marking specific notebooks offline on mobile requires a paid plan.",
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
      competitor: "Evernote .enex",
      note: "Evernote exports to .enex, which is a documented XML format but specific to Evernote. RecipeSage supports well-recognized standardized recipe formats like JSON-LD.",
    },
  ],
  whySwitch: [
    {
      title: "Structure is what unlocks recipe features",
      body: "A shopping list that combines garlic across three recipes, 2x scaling, nutrition per serving, and an ingredient-aware search all require parsed ingredients. Evernote stores recipes as free text in a note, so none of those features can exist there.",
    },
    {
      title: "A real meal planner instead of a typed table",
      body: "RecipeSage has a drag-and-drop weekly calendar with recurring items and one-click add-to-shopping-list. In Evernote, meal planning is either a hand-typed table in a note or pasting note links into Google Calendar events.",
    },
    {
      title: "An automatic shopping list",
      body: "Click a recipe, send it to the shopping list, and ingredients merge with what's already there and group by aisle. In Evernote, you maintain a pinned 'Shopping list' note by hand and retype ingredients every week.",
    },
    {
      title: "No 50-note cap and no 1-device cap",
      body: "Recipes alone exhaust Evernote's 50-note free tier for almost any home cook, and the 1-device cap means a phone and a laptop can't both be signed in for free. RecipeSage is free with no caps, on every device, for everyone in the family.",
    },
    {
      title: "A recipe-focused clipper",
      body: "RecipeSage's Firefox and Chrome extension parses a recipe page into a clean structured recipe. Evernote's Web Clipper saves the whole article, including the author's storytelling preamble, the ads, and the unrelated photos.",
    },
    {
      title: "One-click .enex import",
      body: "Export your Evernote notes to .enex from the Mac or Windows app, upload the file, and each note becomes a recipe. Your Evernote account is untouched.",
    },
  ],
  competitorWins: [
    {
      title: "A real general-purpose note app",
      body: "Evernote is genuinely good at meeting notes, journals, scanned documents, and project notes. RecipeSage is recipes-only by design, so Evernote stays useful for everything that isn't a recipe.",
    },
    {
      title: "OCR search across scanned cookbook pages",
      body: "Evernote indexes text inside scanned images and PDFs, so a photo of a cookbook page is searchable. RecipeSage's photo import parses recipes into structured fields, which is a different (and we'd argue more useful) thing for cooking, but Evernote's blanket OCR over arbitrary images is a real strength.",
    },
  ],
  migration: {
    headline: "Bringing your Evernote recipes over",
    summary:
      "RecipeSage has a dedicated Evernote importer that reads `.enex` files. Each Evernote note becomes a recipe, with the note title, content, and attached images preserved.",
    steps: [
      {
        body: "In the Evernote Mac or Windows desktop app, select the notebook (or specific notes) that contain your recipes. Export is only available from the desktop apps, not the web app.",
      },
      {
        body: "Right-click and choose Export Notes as ENEX. Save the .enex file to your computer.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then Evernote (ENEX), and upload the file you just exported.",
      },
      {
        body: "RecipeSage runs the import in the background and tags every imported recipe with a timestamped label, so the whole batch is easy to review or undo.",
      },
    ],
    docsUrl: "https://docs.recipesage.com/docs/tutorials/settings/import/evernote/",
    docsLabel: "Read the full Evernote import guide",
    importUrl: "/app/settings/import/enex",
    note: "Because Evernote stores recipes as free text, the importer can't magically split a note into ingredient and direction fields. The content, title, and images all come across, and you can structure individual recipes afterward to take advantage of shopping lists, scaling, and nutrition. Free Evernote users with more than 50 notes can still export everything they already have.",
  },
  faqs: [
    {
      q: "Will my Evernote notes come over as proper recipes?",
      a: "Each note becomes a recipe with its title, content, and images preserved. Because Evernote stores recipes as free-form notes, structured fields like ingredients and directions are inferred where possible, but some recipes will need a quick edit to take full advantage of shopping lists, scaling, and nutrition.",
    },
    {
      q: "Can I keep using Evernote for non-recipe notes?",
      a: "Yes. The .enex import is non-destructive and your Evernote account stays exactly as it is. Many people end up keeping Evernote for meeting notes, journals, and project notes, and use RecipeSage just for recipes.",
    },
    {
      q: "What if a single note contains several recipes?",
      a: "Each Evernote note becomes one RecipeSage recipe. If you have a note with multiple recipes stacked inside it, splitting them into separate notes before exporting gives the cleanest result. You can also split them inside RecipeSage after import.",
    },
    {
      q: "Do tags and notebooks come across?",
      a: "Tags map to RecipeSage labels. Evernote's ENEX export flattens notebook structure into a single file, so notebook names don't come through as folders, but you can re-apply labels in bulk after the import.",
    },
    {
      q: "Do I need a paid Evernote plan to export?",
      a: "No. ENEX export is available on the free plan via the desktop apps, even for accounts over the 50-note cap. You can still export everything you already have.",
    },
  ],
  closing: [
    "Evernote is a great note app. It's just not built for the recipe-specific things home cooks actually want. Try RecipeSage for your recipes, keep Evernote for everything else if you like, and see how it feels :)",
  ],
};
