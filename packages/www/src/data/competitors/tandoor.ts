import type { CompetitorData } from "./types";

export const tandoor: CompetitorData = {
  slug: "tandoor",
  name: "Tandoor Recipes",
  url: "https://tandoor.dev/",
  tagline: "The free, open source Tandoor alternative with no server to run",
  subtitle:
    "RecipeSage is a free, open source recipe organizer, meal planner, and shopping list manager. Use the free hosted version in any browser, on iOS, on Android, and on the desktop, or self-host it if you'd rather.",
  seoDescription:
    "A Tandoor Recipes alternative you don't have to host. RecipeSage is free and open source, with native iOS, Android, and desktop apps, and self-hosting stays optional.",
  cardSummary:
    "A self-hosted recipe manager. Hosted plans cap the free tier at 10 recipes, and there are no official mobile apps.",
  intro: [
    "Tandoor Recipes is a self-hosted recipe manager. To use it, you either run your own server with Docker or pay for a hosted plan on tandoor.dev. Running your own server means keeping up with updates, backups, and downtime yourself.",
    "My wife and I made RecipeSage as the recipe app we wanted ourselves. It's free and open source too, but you don't need a server to use it. Sign up at recipesage.com and use it in any browser, in native iOS and Android apps, or on the desktop. You can still self-host RecipeSage if you'd like to.",
  ],
  pricingSummary: {
    recipesage:
      "Free forever, hosted for you. No paywall, no ads, no recipe cap, and self-hosting is optional.",
    competitor:
      "Free to self-host. Hosted plans on tandoor.dev: Free (10 recipes, 1 member), Basic EUR 1.99/month, Standard EUR 3.49/month, and Premium AI EUR 4.99/month.",
  },
  table: [
    {
      feature: "Price",
      recipesage: "Free, open source",
      competitor: "Free to self-host, hosted plans up to EUR 4.99/month",
    },
    {
      feature: "Free hosted account, no server needed",
      recipesage: "Unlimited recipes",
      competitor: "10 recipes",
      note: "Tandoor's free hosted plan allows 1 member and 10 recipes. Then it starts at EUR 3.49/month, whereas RecipeSage is free.",
    },
    {
      feature: "iOS and Android apps",
      recipesage: "Free",
      competitor: "PWA or unofficial apps",
      note: "Tandoor installs as a progressive web app. Some community-made clients connect to a Tandoor server, but they aren't made by the Tandoor project.",
    },
    {
      feature: "Native desktop app (Windows, macOS, Linux)",
      recipesage: true,
      competitor: "PWA",
    },
    {
      feature: "Firefox and Chrome extension",
      recipesage: true,
      competitor: false,
    },
    {
      feature: "Printable PDF cookbook generator",
      recipesage: true,
      competitor: "partial",
      note: "Tandoor has printing views and an experimental PDF export. RecipeSage's Cookbook Generator compiles your recipes into one printable PDF with a cover page, optional table of contents, and each recipe on its own page.",
    },
    {
      feature: "Import from a photo or PDF",
      recipesage: true,
      competitor: true,
      note: "Tandoor's AI import reads text, images, and PDFs. It needs an AI provider on a self-hosted install, or AI credits on the hosted plans.",
    },
    {
      feature: "Real multi-user collaboration",
      recipesage: true,
      competitor: true,
      note: "Tandoor's Spaces and Households share meal plans, shopping lists, and the pantry across a household automatically.",
    },
    {
      feature: "Public sharing by link, no account needed",
      recipesage: true,
      competitor: true,
      note: "Both share recipes by link. RecipeSage also gives you a public profile to share a label or your whole collection, plus website embed codes.",
    },
    { feature: "Web app", recipesage: true, competitor: true },
    {
      feature: "Works offline",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Auto import from a URL",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Meal planner",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Smart shopping list with aisle categorization",
      recipesage: true,
      competitor: true,
      note: "Tandoor orders the list by supermarket categories you configure for each store.",
    },
    {
      feature: "Recipe scaling and unit conversion",
      recipesage: true,
      competitor: true,
    },
    {
      feature: "Nutrition tracking",
      recipesage: true,
      competitor: true,
      note: "Tandoor calculates nutrition and price from food properties. RecipeSage tracks macros, vitamins, and minerals per serving and can auto-fill from a pasted nutrition label.",
    },
    {
      feature: "Data portability",
      recipesage: true,
      competitor: true,
      note: "Tandoor exports a full .zip in its own format, plus several other formats. RecipeSage supports well-recognized standardized formats.",
    },
    {
      feature: "Automatic meal planner",
      recipesage: false,
      competitor: true,
      note: "Tandoor can fill a meal plan automatically from rules you set. RecipeSage plans are built by hand.",
    },
    {
      feature: "Pantry with expiry dates",
      recipesage: false,
      competitor: true,
    },
    {
      feature: "Open source",
      recipesage: true,
      competitor: true,
      note: "Both are AGPL. Tandoor adds the Commons Clause, which rules out selling the software or paid hosting of it by anyone other than the licensor.",
    },
    { feature: "Self-hostable", recipesage: true, competitor: true },
  ],
  whySwitch: [
    {
      title: "No server to run",
      body: "RecipeSage is hosted for you at recipesage.com, for free, with no recipe cap. No Docker, no reverse proxy, no database upgrades, and no backups to remember. If you'd still like to self-host, you can.",
    },
    {
      title: "Native mobile and desktop apps",
      body: "RecipeSage has its own iOS, Android, Windows, macOS, and Linux apps. Tandoor runs as a web app or PWA, and native mobile clients come from the community rather than the Tandoor project.",
    },
    {
      title: "A one-click browser extension",
      body: "RecipeSage's Firefox and Chrome extension clips a recipe from the page you're reading into a clean, structured recipe.",
    },
    {
      title: "Easy for the whole family",
      body: "Everyone in the house can make their own free account and share recipes, meal plans, and shopping lists, without anyone needing to be the family sysadmin.",
    },
    {
      title: "Share your recipes with anyone",
      body: "RecipeSage gives you a public profile to share a single recipe, a whole label, or your entire collection by a link anyone can open without an account, plus embed codes to drop a recipe onto a website or blog.",
    },
    {
      title: "Turn your collection into a printable cookbook",
      body: "RecipeSage's Cookbook Generator assembles your recipes into a single PDF, with a cover page, an optional table of contents, and each recipe on its own page with its image and nutrition. It's an easy way to print a personal cookbook or give one as a gift.",
    },
  ],
  competitorWins: [
    {
      title: "Power features for self-hosters",
      body: "Tandoor has OpenID Connect login, Spaces for running several groups on one install, home automation connectors, a chat bot, file storage sync, and AI providers you choose yourself. If you love running your own server, it's a richer toolkit than RecipeSage's self-host setup.",
    },
    {
      title: "Automatic meal planning and a pantry",
      body: "Tandoor can fill your meal plan automatically from rules you set, and its pantry tracks where food is stored and when it expires. RecipeSage has neither today.",
    },
  ],
  migration: {
    headline: "Bringing your Tandoor recipes over",
    summary:
      "Tandoor has a built-in RecipeSage export. It produces a single .json file that RecipeSage's JSON-LD importer reads directly, with your recipe names, descriptions, servings, ingredients, and steps.",
    steps: [
      {
        body: "In Tandoor, open Settings and click Export in the Space section.",
      },
      {
        body: "Set Type to Recipesage, tick All Recipes, and click Export. When it finishes, click Download to save the .json file.",
      },
      {
        body: "Create a free RecipeSage account at recipesage.com.",
      },
      {
        body: "In RecipeSage, open Settings then Import then JSON-LD, and upload the .json file from Tandoor.",
      },
    ],
    docsUrl: "https://docs.recipesage.com/docs/tutorials/settings/import/json-ld/",
    docsLabel: "Read the JSON-LD import guide",
    importUrl: "/app/settings/import/json-ld",
    note: "Tandoor's RecipeSage export doesn't include images, keywords, or source URLs, so you'll want to add photos back to your favorites after importing. Your Tandoor instance isn't changed by the export.",
  },
  faqs: [
    {
      q: "Can I keep running Tandoor while I try RecipeSage?",
      a: "Yes. Exporting from Tandoor doesn't change anything on your instance. Try RecipeSage for a few weeks and keep whichever one fits your kitchen.",
    },
    {
      q: "Will my photos come across from Tandoor?",
      a: "Not through the export. Tandoor's documentation notes that images aren't supported in its RecipeSage export. Recipes that came from a website can be re-clipped from the original page with RecipeSage's browser extension to bring their photos along.",
    },
    {
      q: "I like self-hosting. Can I self-host RecipeSage too?",
      a: "Yes. RecipeSage's code is on GitHub under the AGPL and you can run it on your own server. The difference is that you don't have to, since the hosted version at recipesage.com is free.",
    },
    {
      q: "Is there a free alternative to Tandoor Recipes?",
      a: "Yes. RecipeSage is a free, open source alternative to Tandoor, with no paywall and no ads. You can import your recipes, plan meals, build shopping lists, track nutrition, and use it on the web, desktop, iOS, and Android. If you ever decide to leave, you can export everything or self-host.",
    },
  ],
  closing: [
    "Tandoor is a capable project if you enjoy running your own server. If you'd rather just cook, with native apps and nothing to maintain, give RecipeSage a try. It's free, so there's no harm in seeing how it feels :)",
  ],
};
