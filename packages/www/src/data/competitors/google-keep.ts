import type { CompetitorData } from "./types";

export const googleKeep: CompetitorData = {
  slug: "google-keep",
  name: "Google Keep",
  url: "https://keep.google.com/",
  tagline: "The free, open source Google Keep alternative for recipes",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. If your recipes live in Google Keep notes, upload your Google Takeout export and each note becomes a recipe with ingredients and instructions you can scale, plan, and shop from.",
  seoDescription:
    "Keeping recipes in Google Keep? RecipeSage is a free, open source recipe app with meal planning, smart shopping lists, and Google Takeout import. Always free.",
  cardSummary:
    "A notes app, not a recipe app. No meal planner, no automatic shopping list from your recipes, and no ingredient scaling.",
  intro: [
    "Google Keep is Google's free note and checklist app, and lots of home cooks keep their recipes there: typed into a note, pasted from a website, or snapped from a cookbook page. But Keep stores a recipe as plain text that the app doesn't understand.",
    "My wife and I made RecipeSage for the moment a recipe collection outgrows a notes app. A shopping list that combines garlic from three recipes and 2x scaling only work when ingredients live in structured fields. RecipeSage can read your Google Takeout export directly, so your Keep recipes come over without retyping.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. No paywall, no ads, no recipe caps, and no selling your data.",
    competitor:
      "Free with a Google account, and Keep notes don't count toward your Google storage. Gemini list creation in Keep needs a Google AI plan or a Pixel phone.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "Free with a Google account",
    },
    {
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: false,
      note: "A Keep grocery list is a checklist you fill in by hand. RecipeSage adds a recipe's ingredients in one click, merges duplicates, and groups items by aisle.",
    },
    {
      feature: "Structured ingredient fields",
      recipesage: true,
      competitor: false,
      note: "Keep stores a recipe as free text or a checklist. RecipeSage parses ingredients into quantity, unit, and item, which is what unlocks merged shopping lists and scaling.",
    },
    {
      feature: "Auto import recipes from a URL",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Drag-and-drop meal planner",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Recipe scaling and unit conversion",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Cook Mode (full-screen, distraction-free cooking view)",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Nutrition tracking (macros, vitamins, minerals)",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Firefox and Chrome extension",
      recipesage: true,
      competitor: "partial",
      note: "Keep's Chrome extension saves a page link, selected text, or an image to a note. RecipeSage's clipper parses the page into a structured recipe with ingredients and steps.",
    },
    {
      feature: "Import recipes from a photo (OCR)",
      recipesage: true,
      competitor: "partial",
      note: "Keep's Grab image text pulls the words out of a photo into a note. RecipeSage's photo import turns them into a recipe with ingredients and steps.",
    },
    {
      feature: "Import recipes from PDFs and documents",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Recurring meal plan items",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Built-in kitchen toolkit",
      recipesage: true,
      competitor: false,
      note: "RecipeSage's toolkit includes a measurement converter, a pan and bakeware converter that rescales ingredients and suggests bake time and temperature adjustments, and a cooking-temperature reference for safe internal temperatures.",
    },
    {
      feature: "Native desktop app (Windows, macOS, Linux)",
      recipesage: true,
      competitor: false,
      note: "Keep is used on computers through the web app. Its old Chrome app was retired in 2021.",
    },
    {
      feature: "Shared lists with your household",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Real collaboration with separate accounts",
      recipesage: true,
      competitor: true,
      note: "Keep shares note by note with other Google accounts, and every collaborator can edit.",
    },
    { feature: "Works offline", recipesage: true, competitor: true },
    { feature: "Web app", recipesage: true, competitor: true },
    { feature: "iOS app", recipesage: true, competitor: true },
    { feature: "Android app", recipesage: true, competitor: true },
    {
      feature: "Smartwatch app",
      recipesage: false,
      competitor: true,
      note: "Keep has a Wear OS app for creating notes and checking off lists from your wrist. RecipeSage doesn't have a watch app.",
    },
    { feature: "Open source", recipesage: true, competitor: false },
    { feature: "Self-hostable", recipesage: true, competitor: false },
    {
      feature: "Data portability",
      recipesage: true,
      competitor: "Google Takeout",
      note: "Takeout exports each Keep note as HTML plus a JSON metadata file. That's open and readable, but not a recipe format. RecipeSage supports well-recognized standardized recipe formats like JSON-LD.",
    },
    {
      feature: "Printable PDF cookbook generator",
      recipesage: true,
      competitor: false,
      note: "RecipeSage's Cookbook Generator compiles your recipes into one printable PDF with a cover page, optional table of contents, and each recipe on its own page.",
    },
    {
      feature: "AI cooking assistant",
      recipesage: true,
      competitor: "partial",
      note: "Gemini can write a checklist inside Keep (with a Google AI plan or on Pixel) and search your notes from the Gemini app. It isn't recipe-aware, so there's no scaling or shopping list built from your saved recipes.",
    },
  ],
  whySwitch: [
    {
      title: "Cook Mode",
      body: "RecipeSage's full-screen Cook Mode shows the ingredients and steps together, lets you check off each as you cook, scale servings on the fly, and keeps the screen awake with a large adjustable font. Keep shows a recipe the same way it shows any other note.",
    },
    {
      title: "Structure is what unlocks recipe features",
      body: "A shopping list that combines garlic across three recipes and 2x scaling both need parsed ingredients. In Keep a recipe is a block of text, so those features can't exist there.",
    },
    {
      title: "A real meal planner",
      body: "RecipeSage has a drag-and-drop weekly calendar with recurring items and one-click add-to-shopping-list. Keep has no meal planner, so a weekly plan ends up as another note.",
    },
    {
      title: "Groceries straight from your recipes",
      body: "Send a recipe to your RecipeSage shopping list and its ingredients merge with what's already there, sorted by aisle. The list can be shared with your household, just like the Keep checklist you're used to, minus the retyping.",
    },
    {
      title: "A recipe-focused clipper",
      body: "RecipeSage's Firefox and Chrome extension turns a recipe page into a clean recipe with ingredients and steps, leaving the life story and the ads behind.",
    },
    {
      title: "Built-in kitchen toolkit",
      body: "RecipeSage has built-in converters for units, pan sizes, and cooking temperatures. Keep has none of these.",
    },
    {
      title: "Open source and self-hostable",
      body: "RecipeSage is AGPL-licensed, you can run it on your own server, and you can export your whole library to JSON-LD, PDF, or text any time.",
    },
    {
      title: "Turn your collection into a printable cookbook",
      body: "RecipeSage's Cookbook Generator assembles your recipes into a single PDF, with a cover page, an optional table of contents, and each recipe on its own page with its image and nutrition. It's an easy way to print a personal cookbook or give one as a gift.",
    },
  ],
  competitorWins: [
    {
      title: "Fast, free notes for everything else",
      body: "Keep opens instantly, is already on a lot of Android phones, and handles quick notes, reminders, voice memos with transcription, and to-do lists. RecipeSage is recipes-only by design, so Keep stays useful for everything that isn't a recipe.",
    },
    {
      title: "Checklists on your wrist and across Google",
      body: "Keep's Wear OS app lets you check off a grocery list from your watch, and Keep ties into the rest of Google, from Copy to Google Docs to Gemini. RecipeSage doesn't have a watch app or that kind of ecosystem.",
    },
  ],
  migration: {
    headline: "Bringing your Google Keep recipes over",
    summary:
      "RecipeSage's notes and documents importer reads a Google Takeout export as-is. Each Keep note becomes a recipe, and is split into a title, ingredients, and instructions.",
    steps: [
      {
        body: "Go to Google Takeout at takeout.google.com and sign in.",
      },
      {
        body: 'Click "Deselect all", then select only Keep.',
      },
      {
        body: "Create the export and download the .zip file when it's ready. Takeout can take a while to prepare it.",
      },
      {
        body: "Takeout includes every Keep note, so remove any notes that aren't recipes from the zip if you'd like to keep them out.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then Import from notes apps & documents, and upload the .zip file.",
      },
    ],
    docsUrl:
      "https://docs.recipesage.com/docs/tutorials/settings/import/textfiles/",
    docsLabel: "Read the notes apps & documents import guide",
    importUrl: "/app/settings/import/textfiles",
    note: "Keep notes are free text, so not every note will split cleanly into ingredients and steps. Those still come across with their full text in the notes field and the label \"automatic import unformatted\", so you can find them and tidy them up whenever you like. Your Google Keep notes stay exactly as they are.",
  },
  faqs: [
    {
      q: "Will my Keep notes come over as proper recipes?",
      a: "Most will. RecipeSage uses AI to read each note and fill in the title, ingredients, and instructions. If a note is too loose to split up, it's still imported with its full text and labeled \"automatic import unformatted\" so you can tidy it later.",
    },
    {
      q: "What about my notes that aren't recipes?",
      a: "Takeout exports all of your Keep notes, and every note in the zip is imported as a recipe. Open the zip and delete the non-recipe notes before uploading, or delete the extras in RecipeSage afterward. Each note should hold a single recipe for the best result.",
    },
    {
      q: "Do my Keep labels and photos come across?",
      a: "Not automatically. Keep stores labels in separate metadata files that the importer doesn't read, and photos attached to Keep notes usually won't be matched to their recipe. You can add labels in bulk and re-attach photos for your favorites after importing.",
    },
    {
      q: "I have hundreds of recipes in Keep. Is there a limit?",
      a: "Each import handles up to 500 notes. If you have more, split them across a few zip files and run the import once per zip.",
    },
    {
      q: "Can I keep using Google Keep for my grocery list?",
      a: "Sure. Plenty of people keep Keep for quick notes and to-dos. That said, RecipeSage's shared shopping list can fill itself from your recipes and meal plan, so it may be worth a try for groceries too.",
    },
    {
      q: "Is there a free alternative to Google Keep for recipes?",
      a: "Yes. RecipeSage is a free, open source alternative to Google Keep for recipes, with no paywall and no ads. You can import your recipes, plan meals, build shopping lists, track nutrition, and use it on the web, desktop, iOS, and Android. If you ever decide to leave, you can export everything or self-host.",
    },
  ],
  closing: [
    "Google Keep is handy for quick notes and checklists. It's just not built for recipes. Bring your recipes over to RecipeSage, keep Keep for everything else, and see how it feels :)",
  ],
};
