import type { CompetitorData } from "./types";

export const obsidian: CompetitorData = {
  slug: "obsidian",
  name: "Obsidian",
  url: "https://obsidian.md/",
  tagline: "A free, open source Obsidian alternative built for recipes",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. If your recipes live as Markdown notes in an Obsidian vault, zip the folder and RecipeSage turns each note into a recipe with structured ingredients, a meal planner, a merged shopping list, and scaling.",
  seoDescription:
    "Keeping recipes in Obsidian? RecipeSage is a free, open source recipe app with meal planning, smart shopping lists, scaling, and nutrition. Import your vault. Always free.",
  cardSummary:
    "A notes app, not a recipe app. Meal plans, shopping lists, and scaling depend on community plugins, and there is no web app.",
  intro: [
    "Obsidian is a notes app that stores everything as Markdown files on your device, and some people keep their recipes there. Out of the box, though, a recipe is just a note. Meal plans, shopping lists, and scaling come from community plugins that you install and wire together yourself.",
    "My wife and I made RecipeSage as a real recipe app. The things home cooks actually want (a shopping list that combines garlic from three recipes, a drag-and-drop weekly plan, 2x scaling, nutrition per serving) are built in and work the same on the web, desktop, iOS, and Android. You can zip the recipes folder from your vault and import it in one go.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever. No paywall, no ads, no per-device fees, no sync subscription, and no selling your data.",
    competitor:
      "The app is free, including for commercial use. Optional Sync is $4/user/month (Standard) or $8/user/month (Plus) billed annually, and Publish is $8/site/month.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "Free app, but paid Sync and Publish add-ons",
    },
    {
      feature: "Structured ingredient fields",
      recipesage: true,
      competitor: false,
      note: "Obsidian stores recipes as free-form Markdown. RecipeSage parses ingredients into quantity, unit, and item, which is what unlocks merged shopping lists and scaling.",
    },
    {
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: "partial",
      note: "Obsidian has no shopping list feature of its own. Community plugins like Meal Plan and Recipe Vault can write ingredients into a shopping list note. RecipeSage merges ingredients across recipes and groups them by aisle.",
    },
    {
      feature: "Drag-and-drop meal planner",
      recipesage: true,
      competitor: "partial",
    },
    {
      feature: "Real multi-user collaboration with separate accounts",
      recipesage: true,
      competitor: "partial",
      note: "Obsidian's shared vaults require every collaborator to pay for Sync, and live editing of the same note isn't supported yet. Some households share a vault through a third-party file sync service instead.",
    },
    { feature: "Web app", recipesage: true, competitor: false },
    {
      feature: "Recipe scaling and unit conversion",
      recipesage: true,
      competitor: "partial",
      note: "Obsidian can't scale recipes on its own. Some community plugins add a scaling slider for recipes written in their own recipe markup.",
    },
    {
      feature: "Nutrition tracking (macros, vitamins, minerals)",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Cook Mode (full-screen, distraction-free cooking view)",
      recipesage: true,
      competitor: "partial",
      note: "Some community plugins render a recipe with ingredient checkboxes and timers. RecipeSage's Cook Mode is built in and keeps the screen awake.",
    },
    {
      feature: "Auto import from a URL",
      recipesage: true,
      competitor: "partial",
      note: "Obsidian can do this through the Web Clipper or community plugins such as Recipe Vault. The result is a Markdown note rather than a recipe the app understands.",
    },
    {
      feature: "Recurring meal plan items",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Import from a photo (OCR)",
      recipesage: true,
      competitor: "partial",
      note: "Obsidian can't read recipe photos on its own but there are community plugins that can help. RecipeSage's is entirely built in and feels first-class.",
    },
    {
      feature: "Import from PDF and Word documents",
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
      feature: "Public sharing by link or embed, no account needed",
      recipesage: true,
      competitor: "partial",
      note: "Obsidian can publish notes to the web with the paid Publish add-on. RecipeSage's public profile, link sharing, and website embeds are free.",
    },
    {
      feature: "Firefox and Chrome extension",
      recipesage: true,
      competitor: true,
      note: "Obsidian's official Web Clipper is free and has a recipe template that can pull schema.org recipe data into a Markdown note. RecipeSage's clipper saves the page as a structured recipe with ingredients and steps.",
    },
    {
      feature: "Native iOS, Android, and desktop apps (Windows, macOS, Linux)",
      recipesage: true,
      competitor: true,
    },
    { feature: "Works offline", recipesage: true, competitor: true },
    {
      feature: "Notes stored as plain Markdown files on your device",
      recipesage: false,
      competitor: true,
      note: "Obsidian keeps each note as a file on your device. RecipeSage keeps recipes in its database (hosted, or on your own server if you self-host) and easily exports to standard formats like JSON-LD.",
    },
    {
      feature: "Open source",
      recipesage: true,
      competitor: false,
      note: "The Obsidian app is closed source, though its Web Clipper and many community plugins are open source.",
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
      title: "Recipe features that are built in, not assembled",
      body: "In Obsidian, a recipe setup means choosing plugins, learning their note formats, and hoping each one keeps being maintained (the popular Recipe Grabber plugin has already been archived). In RecipeSage, importing, planning, shopping, scaling, and nutrition are all part of the app and work together from day one.",
    },
    {
      title: "A shopping list that does the merging for you",
      body: "Send a few recipes to the shopping list and RecipeSage combines matching ingredients and groups them by aisle. The whole household sees the same list and can check things off at the store.",
    },
    {
      title: "A real meal planner",
      body: "RecipeSage has a drag-and-drop weekly calendar with recurring items and one-click add-to-shopping-list, on every device.",
    },
    {
      title: "Share with your household without a sync subscription",
      body: "Each family member gets their own free RecipeSage account and can share recipes, meal plans, and shopping lists. With Obsidian, sharing a vault means paid Sync for every person or setting up a third-party sync service yourself.",
    },
    {
      title: "Scaling and nutrition",
      body: "Because RecipeSage understands ingredients, it can scale a recipe to 2x, convert units, and show macros, vitamins, and minerals per serving. A Markdown note can't do that on its own.",
    },
    {
      title: "Use it from any browser",
      body: "RecipeSage works on a Chromebook, a work PC, or a friend's laptop without installing anything. Obsidian has no web app, so your vault is only available where the app is installed and synced.",
    },
    {
      title: "Cook Mode",
      body: "RecipeSage's full-screen Cook Mode shows the ingredients and steps together, lets you check off each as you cook, scale servings on the fly, and keeps the screen awake with a large adjustable font.",
    },
    {
      title: "Turn your collection into a printable cookbook",
      body: "RecipeSage's Cookbook Generator assembles your recipes into a single PDF, with a cover page, an optional table of contents, and each recipe on its own page with its image and nutrition. It's an easy way to print a personal cookbook or give one as a gift.",
    },
  ],
  competitorWins: [
    {
      title: "Your notes are plain files you fully own",
      body: "Obsidian keeps every note as a Markdown file in a folder on your own device, readable by any text editor, with no account needed. RecipeSage is open source, exportable, and self-hostable, but it is still an app with a database rather than a folder of text files.",
    },
    {
      title: "Linking, plugins, and everything else you know",
      body: "Obsidian's links between notes, graph view, Canvas, Bases, and thousands of community plugins make it a flexible place to write. Your recipes can sit right next to your garden journal and your notes from a cooking class. RecipeSage is recipes-only by design.",
    },
  ],
  migration: {
    headline: "Bringing your Obsidian recipes over",
    summary:
      "RecipeSage imports a zip of Markdown, text, and document files. Since an Obsidian vault is just a folder on your computer, you can zip the folder that holds your recipes and upload it. Each note becomes one recipe.",
    steps: [
      {
        body: "Find your vault folder on your computer and open the folder that contains your recipe notes. Only include notes that are recipes, since every note in the zip is imported as one.",
      },
      {
        body: "Zip that folder. On Windows, right-click it and choose Send to then Compressed (zipped) folder. On a Mac, right-click it and choose Compress. Subfolders are fine, and the hidden .obsidian and .trash folders are skipped automatically.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then Import from notes apps & documents, and upload the zip. Up to 500 notes can be imported at a time, so split larger collections across a few zips.",
      },
      {
        body: "RecipeSage runs the import in the background and reads each note to find its title, ingredients, and instructions.",
      },
    ],
    docsUrl:
      "https://docs.recipesage.com/docs/tutorials/settings/import/textfiles/",
    docsLabel: "Read the full notes and documents import guide",
    importUrl: "/app/settings/import/textfiles",
    note: "Obsidian notes are free text, so RecipeSage attempts to split each one into ingredients and instructions. If RecipeSage can't figure out how to format a note, it's still imported with its full text in the notes field and the file name as its title, and labeled \"automatic import unformatted\" so you can find and tidy it later. Images embedded in your notes usually won't come across, because Obsidian stores attachments separately. An image is only attached when it sits next to the note with the same name, like Lasagna.md and Lasagna.jpg.",
  },
  faqs: [
    {
      q: "Will my Obsidian notes come over as proper recipes?",
      a: "Most will. RecipeSage reads each note and fills in the title, ingredients, and instructions. Notes that are more free-form (a list of ideas, or a recipe mixed in with a long story) may land unformatted with their full text kept, and a quick edit afterward gets them ready for shopping lists, scaling, and nutrition.",
    },
    {
      q: "Can I keep using Obsidian for everything else?",
      a: "Yes. Importing only reads a copy of your files, so your vault stays exactly as it is. Plenty of people keep Obsidian for notes and writing and use RecipeSage just for recipes.",
    },
    {
      q: "What if one note has several recipes in it?",
      a: "Each note becomes one recipe. If a note holds several recipes, splitting them into separate notes before zipping gives the cleanest result.",
    },
    {
      q: "What about recipes saved in a plugin's own file type?",
      a: "Not directly. The importer reads .md, .markdown, .txt, .html, .htm, .docx, .rtf, .odt, and .org files, and skips other file types. If a recipe plugin saves notes with its own file extension, you can rename those files to .txt before zipping them, and RecipeSage will read them as plain text.",
    },
    {
      q: "Do I need Obsidian Sync to export?",
      a: "No. Your vault is already a folder of files on your computer, so there's nothing to export. Just zip the recipes folder.",
    },
    {
      q: "Is there a free alternative to Obsidian for recipes?",
      a: "Yes. RecipeSage is a free, open source alternative to Obsidian for recipes, with no paywall and no ads. You can import your recipes, plan meals, build shopping lists, track nutrition, and use it on the web, desktop, iOS, and Android. If you ever decide to leave, you can export everything or self-host.",
    },
  ],
  closing: [
    "Obsidian is a capable notes app. It's just not built for recipes. If you'd rather have meal planning, shopping lists, and scaling that just work for the whole household, give RecipeSage a try for your recipes and keep Obsidian for everything else :)",
  ],
};
