import { program } from "commander";

import { clipUrl } from "./services/clip";

import * as Models from "./models";
import { writeImageURL } from "./services/storage/image";
import { ObjectTypes } from "./services/storage/shared";
const User = Models.User;
const Recipe = Models.Recipe;
const Image = Models.Image;
const Recipe_Image = Models.Recipe_Image;

program
  .option("-e, --email [accountemail]", "Email for the account to import to")
  .parse(process.argv);
const opts = program.opts();
const options = {
  email: opts.email as string,
};

if (!options.email) {
  throw new Error("Must provide email");
}

const failedUrls: string[] = [];

let file = "";

const run = async () => {
  const urls = file
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  console.log(urls);

  const user = await User.findOne({
    email: options.email,
  });
  if (!user) throw new Error("User with that email not found");

  for (const url of urls) {
    console.log(`Importing ${url}`);
    try {
      const clippedRecipe = await clipUrl(url);
      const recipe = await Recipe.create({
        userId: user.id,
        title: clippedRecipe.title,
        description: clippedRecipe.description,
        source: clippedRecipe.source,
        yield: clippedRecipe.yield,
        activeTime: clippedRecipe.activeTime,
        totalTime: clippedRecipe.totalTime,
        ingredients: clippedRecipe.ingredients,
        instructions: clippedRecipe.instructions,
        notes: clippedRecipe.notes,
      });

      if (clippedRecipe.imageURL) {
        try {
          const file = await writeImageURL(
            ObjectTypes.RECIPE_IMAGE,
            clippedRecipe.imageURL,
            true
          );

          const image = await Image.create({
            userId: user.id,
            location: file.location,
            key: file.key,
            json: file,
          });

          await Recipe_Image.create({
            recipeId: recipe.id,
            imageId: image.id,
            order: 0,
          });
        } catch (e) {
          console.error(e);
          console.log(`Could not fetch image for ${url}`);
        }
      }
    } catch (e) {
      console.error(e);
      console.log(`Could not import ${url}`);
      failedUrls.push(url);
    }
  }

  console.log("==== Failed URLs ====");
  console.log(failedUrls.join("\n") || "None");
};

const stdin = process.openStdin();

stdin.on("data", function (chunk) {
  file += chunk;
});

stdin.on("end", function () {
  run();
});

process.on("SIGTERM", () => {
  console.log("RECEIVED SIGTERM - STOPPING JOB");
  process.exit(0);
});
