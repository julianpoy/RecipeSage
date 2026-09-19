import type { CompetitorData } from "./types";

export const notion: CompetitorData = {
  slug: "notion",
  name: "Notion",
  url: "https://www.notion.com/",
  tagline: "The free, open source Notion alternative for your recipes",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. If your recipes live in a Notion database, RecipeSage imports your Markdown export and gives your collection structured ingredients, automatic shopping lists, and scaling without building any of it yourself.",
  seoDescription:
    "Keeping recipes in Notion? RecipeSage is a free, open source Notion alternative for recipes, with recipe import, meal planning, and smart shopping lists. Always free.",
  cardSummary:
    "A general workspace, not a recipe app. No recipe parsing, nutrition, or cooking view, and scaling or shopping lists only through formulas you build yourself.",
  intro: [
    "Notion is a general-purpose workspace for docs, wikis, and databases. Some people keep their recipes there in a database built from a template, but Notion doesn't understand a recipe. It's a note taking platform, rather than a purpose-built recipe manager.",
    "My wife and I made RecipeSage for people who want the recipe parts done for them. RecipeSage understands ingredients out of the box, so paste a recipe or clip it from a blog and you get merged shopping lists and 2x scaling right away. You can bring your Notion recipes over from a Markdown export.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. No paywall, no ads, no member or block limits, and no selling your data.",
    competitor:
      "Free for individuals. Free workspaces with 2 or more members are limited to 1,000 blocks. Plus is $10 per seat per month billed annually ($12 monthly), Business is $20 ($24 monthly) and is the lowest plan with full Notion AI.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "Free for one person, then $10-$20 per seat per month",
    },
    {
      feature: "Free-tier capacity",
      recipesage: "Unlimited recipes, unlimited members",
      competitor: "Unlimited alone, 1,000 blocks with 2+ members",
      note: "A free Notion workspace is unlimited for a single person. Once a second member joins, the whole workspace is limited to 1,000 blocks, and every line of text in a recipe counts as a block.",
    },
    {
      feature: "Structured ingredient fields",
      recipesage: true,
      competitor: "partial",
      note: "Notion can only treat ingredients as data if you enter each one as a row in an ingredients database. RecipeSage parses pasted or imported ingredients into quantity, unit, and item automatically.",
    },
    {
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: false,
      note: "RecipeSage automatically categorizes your items into grocery store isles (which are customizable, too!)",
    },
    {
      feature: "Auto import recipes from a URL",
      recipesage: true,
      competitor: false,
      note: "Clipping a recipe blog into Notion saves the article, including the story before the recipe. Nothing is broken out into ingredients, directions, or servings.",
    },
    {
      feature: "Recipe scaling and unit conversion",
      recipesage: true,
      competitor: "partial",
      note: "Possible in Notion only with formula-driven templates where every ingredient is its own database row.",
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
    },
    {
      feature: "Browser extension",
      recipesage: true,
      competitor: true,
      note: "Notion's Web Clipper for Chrome and Safari saves the whole web page. RecipeSage's Firefox and Chrome extension parses the page into a structured recipe with ingredients and steps.",
    },
    {
      feature: "Built-in kitchen toolkit",
      recipesage: true,
      competitor: false,
      note: "RecipeSage's toolkit includes a measurement converter, a pan and bakeware converter that rescales ingredients and suggests bake time and temperature adjustments, and a cooking-temperature reference for safe internal temperatures.",
    },
    {
      feature: "Works offline",
      recipesage: true,
      competitor: "partial",
      note: "Notion's desktop and mobile apps can keep pages offline, but not in the browser. Downloading a database only includes the first 50 rows of its first view.",
    },
    {
      feature: "Native desktop app (Windows, macOS, Linux)",
      recipesage: true,
      competitor: "partial",
      note: "Notion has Mac and Windows apps but no Linux app. RecipeSage has native apps for all three.",
    },
    {
      feature: "Drag-and-drop meal planner",
      recipesage: true,
      competitor: true,
      note: "Notion's calendar database view lets you drag recipe cards between days, which is what most meal planning templates use.",
    },
    {
      feature: "Recurring meal plan items",
      recipesage: true,
      competitor: true,
      note: "Notion's repeating database templates can create an entry every day, week, or month.",
    },
    {
      feature: "Public sharing by link, no account needed",
      recipesage: true,
      competitor: true,
    },
    { feature: "Web, iOS, and Android apps", recipesage: true, competitor: true },
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
      note: "RecipeSage supports well-recognized standardized recipe formats like JSON-LD. Notion outputs unstructured text.",
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
      note: "Notion AI is a general assistant, fully included only on the Business plan and above. It isn't recipe-aware. RecipeSage's cooking assistant is entirely optional and unobtrusive if you do not want it.",
    },
  ],
  whySwitch: [
    {
      title: "Recipe features without building them",
      body: "In Notion, scaling and shopping lists only work if you enter each ingredient as a database row and maintain the formulas behind it. RecipeSage parses ingredients from plain text, so every recipe you paste, clip, or import gets scaling and shopping lists automatically.",
    },
    {
      title: "A clipper that understands recipes",
      body: "RecipeSage's Firefox and Chrome extension turns a recipe page into a clean recipe with ingredients and steps. Notion's Web Clipper saves the whole article, story and all.",
    },
    {
      title: "An automatic shopping list",
      body: "Send a recipe or a week of meals to the shopping list and ingredients merge with what's already there, grouped by aisle. No relations, rollups, or copy and paste.",
    },
    {
      title: "Nutrition and Cook Mode",
      body: "RecipeSage tracks macros, vitamins, and minerals per serving, and its full-screen Cook Mode lets you check off ingredients and steps, scale servings on the fly, and keeps the screen awake. Notion has neither.",
    },
    {
      title: "Share with your household for free",
      body: "Each family member can have their own RecipeSage account and share recipes, plans, and shopping lists, with no member or block limits.",
    },
    {
      title: "Open source",
      body: "RecipeSage's code is on GitHub under the AGPL, and you can self-host it. Export everything in standard formats any time.",
    },
    {
      title: "Turn your collection into a printable cookbook",
      body: "RecipeSage's Cookbook Generator assembles your recipes into a single PDF, with a cover page, an optional table of contents, and each recipe on its own page with its image and nutrition. It's an easy way to print a personal cookbook or give one as a gift.",
    },
  ],
  competitorWins: [
    {
      title: "A polished general-purpose workspace",
      body: "Notion's real-time collaboration, calendar views, and free publishing are useful for far more than cooking. Many people keep Notion for everything else and use RecipeSage just for recipes.",
    },
  ],
  migration: {
    headline: "Bringing your Notion recipes over",
    summary:
      "RecipeSage's notes and documents importer reads Notion's Markdown & CSV export. Each recipe page becomes a RecipeSage recipe, and the text is sorted into a title, ingredients, and instructions.",
    steps: [
      {
        body: "In Notion, open the page or database that contains your recipes.",
      },
      {
        body: "Click the ••• menu at the top right and choose Export.",
      },
      {
        body: 'Choose "Markdown & CSV" and turn on "Include subpages", then export. Notion downloads a .zip file.',
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then Notes apps & documents, and upload the .zip file as-is.",
      },
      {
        body: 'RecipeSage runs the import in the background. Recipes it couldn\'t sort into ingredients and instructions get the label "automatic import unformatted" so you can find them later.',
      },
    ],
    docsUrl:
      "https://docs.recipesage.com/docs/tutorials/settings/import/textfiles/",
    docsLabel: "Read the full notes and documents import guide",
    importUrl: "/app/settings/import/textfiles",
    note: "Notion pages are free text, so some recipes may land unformatted, with the full page text kept in the notes and the file name as the title. You can tidy those up whenever you like. If the .zip Notion gives you contains another .zip inside it, unzip it once and upload the inner .zip instead. Up to 500 pages can be imported at a time.",
  },
  faqs: [
    {
      q: "Will my Notion recipes come over as proper recipes?",
      a: "Each recipe page becomes a RecipeSage recipe, and RecipeSage parses the text into a title, ingredients, and instructions. If a page can't be parsed, it's still imported with its full text in the notes, labeled so you can tidy it up later.",
    },
    {
      q: "What happens to my Notion database properties and images?",
      a: "RecipeSage imports each page's Markdown file and skips the CSV table, so database properties like tags or ratings don't come across as fields. Images from your Notion pages generally don't come across either, but you can add photos in RecipeSage after the import.",
    },
    {
      q: "What if my Notion workspace has pages that aren't recipes?",
      a: "Every page in the export becomes a recipe, so export just the recipe page or database rather than your whole workspace. You can also remove non-recipe files from the .zip before uploading.",
    },
    {
      q: "Can I keep using Notion for everything else?",
      a: "Yes. Exporting doesn't change anything in Notion. Lots of people keep Notion for notes and projects and use RecipeSage just for recipes.",
    },
    {
      q: "Is there a free alternative to Notion for recipes?",
      a: "Yes. RecipeSage is a free, open source alternative to Notion for recipes, with no paywall and no ads. You can import your recipes, plan meals, build shopping lists, track nutrition, and use it on the web, desktop, iOS, and Android. If you ever decide to leave, you can export everything or self-host.",
    },
  ],
  closing: [
    "Notion is a capable workspace. It's just not built for recipes. If you're tired of maintaining formulas to get a shopping list, give RecipeSage a try for your recipes and see how it feels :)",
  ],
};
