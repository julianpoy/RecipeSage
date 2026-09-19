import type { CompetitorData } from "./types";

export const appleNotes: CompetitorData = {
  slug: "apple-notes",
  name: "Apple Notes",
  url: "https://www.icloud.com/notes",
  tagline: "The free, open source Apple Notes alternative for your recipes",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. If your recipes live in a folder in Apple Notes, export them as Markdown and RecipeSage turns each note into a recipe with structured ingredients, automatic shopping lists, and scaling.",
  seoDescription:
    "Keeping recipes in Apple Notes? RecipeSage is a free, open source recipe app with meal planning, smart shopping lists, and apps for Android and Windows too. Always free.",
  cardSummary:
    "A notes app, not a recipe app. No meal planner, no shopping list merging, and no Android or Windows app.",
  intro: [
    "Apple Notes comes free on every iPhone, iPad, and Mac, so a \"Recipes\" folder in Notes is where a lot of home cooks start. But Notes treats a recipe the same as any other note: a block of text that the app doesn't understand. It can't scale a recipe, plan your week, or build a shopping list from the recipes you want to cook.",
    "My wife and I made RecipeSage as a real recipe app for exactly this situation. The things home cooks actually want (a shopping list that combines garlic from three recipes, or 2x scaling) only work when ingredients live in structured fields. Since iOS 26 and macOS Tahoe, Apple Notes can export notes as Markdown, and RecipeSage can import those files directly, so you don't have to retype anything.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. No paywall, no ads, no storage tiers, and no selling your data.",
    competitor:
      "Free with any Apple device. Sync uses iCloud, which includes 5GB free shared with photos and backups, and iCloud+ starts at $0.99/month for 50GB.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "Free with Apple devices",
      note: "Apple Notes itself is free. It stores notes in iCloud, which includes 5GB free, with iCloud+ plans from $0.99/month if you need more space.",
    },
    {
      feature: "Structured ingredient fields",
      recipesage: true,
      competitor: false,
      note: "Apple Notes stores recipes as free text. RecipeSage parses ingredients into quantity, unit, and item, which is what unlocks merged shopping lists and scaling.",
    },
    {
      feature: "Auto import recipes from a URL",
      recipesage: true,
      competitor: false,
      note: "Apple Notes doesn't read recipe pages. Saving a page from Safari keeps a link, not the ingredients and directions.",
    },
    {
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: false,
      note: "A shopping list in Apple Notes is a checklist you type by hand. No combining ingredients across recipes, no aisle grouping, and no add-to-list from a recipe.",
    },
    {
      feature: "Drag-and-drop meal planner",
      recipesage: true,
      competitor: false,
      note: "Apple Notes has no meal planner. People usually type the week's meals into a note or a table.",
    },
    {
      feature: "Recipe scaling",
      recipesage: true,
      competitor: false,
      note: "Apple Notes can't tell an ingredient from a sentence, so it can't rescale quantities.",
    },
    {
      feature: "Nutrition tracking (macros, vitamins, minerals)",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Cook Mode (full-screen, distraction-free cooking view)",
      recipesage: true,
      competitor: false,
      note: "Apple Notes is a general note app with no cooking view.",
    },
    {
      feature: "Android app",
      recipesage: true,
      competitor: false,
      note: "There's no Apple Notes app for Android. Android users can only sign in to iCloud.com in a browser.",
    },
    {
      feature: "Native desktop app (Windows, macOS, Linux)",
      recipesage: true,
      competitor: "partial",
      note: "Apple Notes has a native Mac app, but nothing for Windows or Linux beyond the iCloud.com website.",
    },
    {
      feature: "Firefox and Chrome extension",
      recipesage: true,
      competitor: false,
      note: "On Apple devices you can use the Share menu to save a web page link into a note. RecipeSage's clipper parses the page into a structured recipe with ingredients and steps.",
    },
    {
      feature: "Public sharing by link or embed, no account needed",
      recipesage: true,
      competitor: false,
      note: "RecipeSage gives you a public profile to share a recipe, a label, or your whole collection by link, plus website embed codes. Apple Notes sharing requires each person to sign in with an Apple Account.",
    },
    {
      feature: "Recurring meal plan items",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Import recipes from a photo (OCR)",
      recipesage: true,
      competitor: "partial",
      note: "Apple Notes has a built-in document scanner and makes scanned text searchable, but the scan stays an image in a free-form note. RecipeSage's photo import parses it into a recipe with structured fields.",
    },
    {
      feature: "Import recipes from PDFs and documents",
      recipesage: true,
      competitor: false,
      note: "Apple Notes can attach files to a note, but it doesn't read them as recipes.",
    },
    {
      feature: "Typo-tolerant search",
      recipesage: true,
      competitor: "partial",
      note: "Apple Notes searches typed and handwritten text, text in scans, and objects in images. Typo tolerance isn't documented, and search isn't ingredient-aware.",
    },
    {
      feature: "Web app (use from any browser)",
      recipesage: true,
      competitor: "partial",
      note: "Apple Notes is available in a browser at iCloud.com, with your Apple Account.",
    },
    { feature: "iOS app", recipesage: true, competitor: true },
    {
      feature: "Real collaboration with separate accounts",
      recipesage: true,
      competitor: true,
      note: "Apple Notes supports real-time shared notes and folders with edit or view permissions. Everyone needs an Apple Account to view or edit.",
    },
    {
      feature: "Works offline",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Printable PDF cookbook generator",
      recipesage: true,
      competitor: false,
      note: "RecipeSage's Cookbook Generator compiles your recipes into one printable PDF with a cover page, optional table of contents, and each recipe on its own page.",
    },
    {
      feature: "Built-in kitchen toolkit",
      recipesage: true,
      competitor: false,
      note: "RecipeSage's toolkit includes a measurement converter, a pan and bakeware converter that rescales ingredients and suggests bake time and temperature adjustments, and a cooking-temperature reference for safe internal temperatures.",
    },
    {
      feature: "AI cooking assistant",
      recipesage: true,
      competitor: "partial",
      note: "On supported devices, Apple Intelligence Writing Tools can proofread, rewrite, or summarize a note. They aren't recipe-aware, so they can't scale a recipe, build a shopping list, or help with cooking.",
    },
    {
      feature: "Data portability",
      recipesage: true,
      competitor: "Markdown, PDF",
      note: "Apple Notes exports notes as PDF, and since iOS 26 and macOS Tahoe also as Markdown. That's portable text, but not a recipe format. RecipeSage supports well-recognized standardized recipe formats like JSON-LD.",
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
  ],
  whySwitch: [
    {
      title: "Structure is what unlocks recipe features",
      body: "A shopping list that combines garlic across three recipes and 2x scaling both need parsed ingredients. In Apple Notes a recipe is free text, so none of those features can exist there.",
    },
    {
      title: "An automatic shopping list",
      body: "Send a recipe to the shopping list and its ingredients merge with what's already there and group by aisle. In Apple Notes you keep a checklist note and retype ingredients every week.",
    },
    {
      title: "A real meal planner",
      body: "RecipeSage has a drag-and-drop weekly calendar with recurring items and one-click add-to-shopping-list. In Apple Notes, meal planning is a list or table you type yourself.",
    },
    {
      title: "Cook Mode",
      body: "RecipeSage's full-screen Cook Mode shows the ingredients and steps together, lets you check off each as you cook, scale servings on the fly, and keeps the screen awake with a large adjustable font.",
    },
    {
      title: "Works for the whole household, Android included",
      body: "RecipeSage has native apps for iOS, Android, Windows, macOS, and Linux, plus a full web app. If someone in your family uses Android or a Windows PC, they get a real app instead of a browser tab signed in to iCloud.",
    },
    {
      title: "Share recipes with anyone",
      body: "Share a single recipe, a label, or your whole collection with a link anyone can open, no account needed, or embed a recipe on your blog. Friends don't need an Apple device to see what you're cooking.",
    },
    {
      title: "A recipe-focused clipper",
      body: "RecipeSage's Firefox and Chrome extension, plus URL import, turn a recipe blog post into a clean recipe with ingredients and steps. No more pasting the whole page into a note and scrolling past the life story.",
    },
    {
      title: "Turn your collection into a printable cookbook",
      body: "RecipeSage's Cookbook Generator assembles your recipes into a single PDF, with a cover page, an optional table of contents, and each recipe on its own page with its image and nutrition. It's an easy way to print a personal cookbook or give one as a gift.",
    },
  ],
  competitorWins: [
    {
      title: "Already on your iPhone, and good at everything else",
      body: "Apple Notes is built in, free, and fast to open, and it works well for lists, journals, and quick thoughts. RecipeSage is recipes-only by design, so Notes stays useful for everything that isn't a recipe.",
    },
  ],
  migration: {
    headline: "Bringing your Apple Notes recipes over",
    summary:
      "RecipeSage imports recipes from notes apps and documents. Export your recipe notes from Apple Notes as Markdown, zip them up, and each note becomes a recipe. AI reads each note and splits it into a title, ingredients, and instructions.",
    steps: [
      {
        body: "Make sure your Mac is on macOS Tahoe (26) or later. Markdown export also works on iOS 26 and iPadOS 26, but the Mac is the easiest way to export many notes at once.",
      },
      {
        body: "On your Mac, open Notes and select the recipe notes you want to export.",
      },
      {
        body: "Choose File then Export as then Markdown, and pick a folder to save them to.",
      },
      {
        body: "Zip that folder. On a Mac, right-click the folder and choose Compress.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then Import from notes apps & documents, and upload the zip file. Each import can hold up to 500 notes.",
      },
    ],
    docsUrl:
      "https://docs.recipesage.com/docs/tutorials/settings/import/textfiles/",
    docsLabel: "Read the full notes app import guide",
    importUrl: "/app/settings/import/textfiles",
    note: "Notes are free text, so AI does its best to find the ingredients and instructions in each one. If a note can't be read that way, it's still imported with its full text in the recipe notes, the file name as the title, and the label \"automatic import unformatted\", so you can find those recipes and tidy them up whenever you like. On iPhone or iPad you can export one note at a time with Share then Export as Markdown.",
  },
  faqs: [
    {
      q: "Will my Apple Notes recipes come over as proper recipes?",
      a: "Usually, yes. Each note becomes a recipe, and is split into a title, ingredients, and instructions. Notes that are hard to read automatically still come across with their full text, labeled so you can find and tidy them later.",
    },
    {
      q: "What if I'm not on iOS 26 or macOS Tahoe yet?",
      a: "Markdown export arrived in iOS 26, iPadOS 26, and macOS Tahoe, so you'll need one of those to export your notes. Updating your Mac and exporting from there is the quickest route for a big collection.",
    },
    {
      q: "Should I only export my recipe notes?",
      a: "Yes. Every document in the zip is imported as a recipe, so select just your recipe notes, or a Recipes folder, before exporting. Each note should hold one recipe for the cleanest result.",
    },
    {
      q: "Can I keep using Apple Notes for everything else?",
      a: "Of course. The import doesn't change anything in Apple Notes. Plenty of people keep Notes for lists and quick thoughts and use RecipeSage just for recipes.",
    },
    {
      q: "Can my family on Android use RecipeSage?",
      a: "Yes. RecipeSage has native apps for Android and iOS, desktop apps for Windows, macOS, and Linux, and a web app, so everyone in the household can share recipes, meal plans, and shopping lists from whatever device they own.",
    },
    {
      q: "Is there a free alternative to Apple Notes for recipes?",
      a: "Yes. RecipeSage is a free, open source alternative to Apple Notes for recipes, with no paywall and no ads. You can import your recipes, plan meals, build shopping lists, track nutrition, and use it on the web, desktop, iOS, and Android. If you ever decide to leave, you can export everything or self-host.",
    },
  ],
  closing: [
    "Apple Notes is a good notes app. It's just not built for the recipe-specific things home cooks want. Try RecipeSage for your recipes, keep Notes for everything else, and see how it feels :)",
  ],
};
