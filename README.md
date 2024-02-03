<a href="https://recipesage.com"><img align="left" width="100" height="100" src="packages/frontend/src/assets/imgs/logo_green.png"></img></a>

# RecipeSage - A Collaborative Recipe Keeper, Meal Planner, and Shopping List Organizer

Share and collaborate on recipes, manage household shopping lists and meal planning, and import recipes from anywhere on the web instantly.

<a href="https://docs.recipesage.com">Documentation</a> | <a href="https://recipesage.com">Hosted Version</a> | <a href="https://github.com/julianpoy/recipesage-selfhost">Selfhost Resources</a>

## :fork_and_knife: What can RecipeSage do?

- **Import from any URL**: Create a recipe simply by punching in a web URL
- **Powerful search**: Search every field within your recipes including misspellings and similar words
- **Labelling/categorization system**: Tag your recipes and filter by tags
- **Drag and drop meal planning**: Schedule your meals interactively, quickly and easily
- **Shopping lists**: Automatically categorized and intelligently grouped - add your recipes directly to a shopping list and similar items will be combined
- **Sharing and public profiles**: Share your recipe collection and collaborate on meal plans/shopping lists with your family or friends
- **Import**: Supports Pepperplate, Living Cookbook, and Paprika
- **Export**: Back up your recipes in multiple formats for data portability
- **Dark mode**: Never blind yourself at night again! _(or leave dark mode enabled all the time like I do)_

You can access the hosted version of RecipeSage here: https://recipesage.com

You can also selfhost your own copy or RecipeSage (see https://github.com/julianpoy/recipesage#ramen-self-hosting)

# :hamburger: GIFs

### Store your recipes

All of your recipes in one place, and access them from any device.

<img src="Assets/myrecipes.gif"></img>

### Progressive Web App

Feels native on every device, and can be installed to the homescreen.

<img src="Assets/recipe-mobile.gif"></img>

### Automatically import from any URL

Import recipes from any website out there _(see [RecipeClipper](https://github.com/julianpoy/recipeclipper) for more info on how it does this)_.

<img src="Assets/automatic-import.gif"></img>

### Plan your meals and shopping

A built-in meal planner makes it easy to plan your meals. Meal plans and shopping lists can be shared between multiple people!

Meal plans support drag and drop, shopping lists support automatic item categorization.

<img src="Assets/mealplan.gif"></img>

# :ramen: Self Hosting

To selfhost RecipeSage, I recommend that you use the preconfigured docker compose files available here: https://github.com/julianpoy/recipesage-selfhost

You're welcome to configure or set up your own selfhost config based on this repository, but you may run into complications. The selfhost repository is setup to be easy to spin up, while this repository is oriented towards development.

# :bread: License

RecipeSage is dual-licensed.

For all **non-commercial usage**, RecipeSage is available for use under the terms of the [AGPL-3.0 license](https://www.gnu.org/licenses/agpl-3.0.en.html).

For all **commercial usage**, RecipeSage is only available for licensing upon request. You may contact me at julian@recipesage.com to request a license.
Pricing for commercial licenses will depend on usage, and all associated fees/proceeds are intended to support the project and community as a whole.

# :doughnut: CLA

Contributor license agreement.

This allows RecipeSage to continue to provide the hosted instance, as well as license the API to other projects that may not have compatible licenses with AGPL.

When contributing or suggesting code for RecipeSage, you irrevocably grant RecipeSage all rights to that code. See the [CLA file](docs/CLA.md) in the repo for the complete CLA.

# 🐤 Contributing

## Translations

Translations can be contributed via the RecipeSage Weblate instance at [https://weblate.recipesage.com](https://weblate.recipesage.com) which automatically syncs to this repository. You can login there with a Github account and get started translating.

If you'd rather translate the JSON files directly, you're welcome to do that as well. You can find all of the corresponding language files [here](https://github.com/julianpoy/RecipeSage/tree/master/packages/frontend/src/assets/i18n).

Entirely AI-generated translations are not currently accepted, since they very frequently produce low-quality and inaccurate results. When using AI to assist in your translation efforts, please use DeepL or Google Translate - do not translate using ChatGPT.

## Code

Code contributions are always very, very welcome. I'm very open to collaborating, and if there's a feature you'd like to see come to RecipeSage I'd love to help you facilitate that.

Although you don't have to reach out before starting work and contributing a PR, either opening an issue and tagging me (@julianpoy), or commenting on an existing issue is a good idea. I may have suggestions for how to approach the problem, where one might look to implement a feature, or general guidance of how to "fit" the RecipeSage UX.

### Development

Below are some notes for getting setup to contribute code.

#### Setting-up your development environment

1. Install [Docker](https://docs.docker.com/get-docker/) and [Node](https://nodejs.org/en/)
2. Clone this repo
3. Create a `.env` file in the root of the repository using `example.env` as a template. These can be left as placeholders, but the dependent functionality will not work without a real key in place.
4. Install dependencies by running `npm install` at the root of the repo.
5. Start the Docker containers by running `docker compose up -d` in the cloned repo
6. Run database migrations `docker compose exec backend npx prisma migrate dev`
7. RecipeSage should be running on `localhost` on port `80`

#### Notes about the repo

1. The repo uses the monorepo management tool [nx](https://nx.dev/nx-api). You'll find things divided up in the `packages` directory.
2. I'm currently migrating to Prisma & TRPC, so any new functionality should be added within the `trpc` package rather than the `backend` package, unless it's an update to an existing behavior that does not merit moving.

Backend API tests can be run via `docker compose exec backend env NODE_ENV=test POSTGRES_LOGGING=false npx nx test backend`.
