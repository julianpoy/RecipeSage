<a href="https://recipesage.com"><img align="left" width="100" height="100" src="packages/frontend/src/assets/imgs/logo_green.png"></img></a>

# RecipeSage - A Collaborative Recipe Keeper, Meal Planner, and Shopping List Organizer

Share and collaborate on recipes, manage household shopping lists and meal planning, and import recipes from anywhere on the web instantly.

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

To selfhost RecipeSage, I recommend that you use the preconfigured docker-compose files available here: https://github.com/julianpoy/recipesage-selfhost

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

# 🐤: Contributing

Setting-up your development environment.

Your development environment can be setup with a few easy steps.

1. Generate the ssl certificates for your devbox by running `./scripts/generate-ssl.sh` from the project's root directory
2. Up the docker images `docker-compose up -d` (If you don't have docker installed, you may get it [here](https://docs.docker.com/get-docker/)
3. Run the migrations scripts; `docker-compose exec backend npx tsx packages/backend/src/migrate.js`
4. That's all! Your localized version of recipe sage should be viewable at `localhost` on port `80`🐣

Backend API tests can be run via `docker-compose exec backend npx nx test backend`
