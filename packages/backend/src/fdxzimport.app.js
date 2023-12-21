import "./services/sentry-init.js";
import * as Sentry from "@sentry/node";

import * as fs from "fs-extra";
import * as extract from "extract-zip";
import * as xmljs from "xml-js";

import {
  sequelize,
  Recipe,
  Label,
  Recipe_Label,
  Recipe_Image,
  Image,
} from "./models/index.js";

import * as Util from "@recipesage/util";
import * as UtilService from "./services/util.js";
import { writeImageBuffer, writeImageFile } from "./services/storage/image";
import { ObjectTypes } from "./services/storage/shared";

const runConfig = {
  path: process.argv[2],
  userId: process.argv[3],
  excludeImages: process.argv.indexOf("--excludeImages") > -1,
  multipleImages: process.argv.indexOf("--multipleImages") > -1,
};

const logError = (e) => {
  console.error(e);

  Sentry.withScope((scope) => {
    scope.setExtra("runConfig", runConfig);
    scope.setExtra("user", runConfig.userId);
    Sentry.captureException(e);
  });
};

const cleanup = () => {
  fs.removeSync(zipPath);
  fs.removeSync(extractPath);
};

const exit = (status) => {
  Sentry.close(2000);

  cleanup();
  process.exit(status);
};

const zipPath = runConfig.path;
const extractPath = zipPath + "-extract";
let xmlPath;

// Convert input to array if necessary
function arrayifyAssociation(assoc) {
  if (!assoc) return [];
  if (typeof assoc.length === "number") return assoc;
  return [assoc];
}

function fetchDeepProp(base, propName) {
  const flat = base[propName]; // RecipeInstruction format
  const nested = base[propName + "s"]; // RecipeInstructions.RecipeInstructon format

  const raw = nested ? nested[propName] : flat; // Result is either an object, array, or null

  return arrayifyAssociation(raw);
}

async function main() {
  try {
    try {
      await extract(zipPath, { dir: extractPath });

      // Was compressed, therefore was likely FDXZ
      xmlPath = extractPath + "/Data.xml";
    } catch (e) {
      if (e.message === "end of central directory record signature not found") {
        // Was not compressed - likely just FDX instead of FDXZ
        xmlPath = zipPath;
      } else {
        throw e;
      }
    }

    let xml;
    let data;
    try {
      xml = fs.readFileSync(xmlPath, "utf8");
      data = JSON.parse(xmljs.xml2json(xml, { compact: true, spaces: 4 }));
    } catch (err) {
      if (err.message.toLowerCase().includes("invalid attribute name")) {
        try {
          xml = xml.replace(/<RecipeNutrition.*\/>/g, "");
          data = JSON.parse(xmljs.xml2json(xml, { compact: true, spaces: 4 }));
        } catch (err) {
          fs.mkdirSync("/tmp/chefbook-fail-dump", { recursive: true });
          fs.copyFileSync(
            xmlPath,
            `/tmp/chefbook-fail-dump/fdxz-fail-${Math.floor(
              Math.random() * 10 ** 10,
            )}.xml`,
          );
          err.devmsg = "tried to replace RecipeNutrition, but failed";
          err.status = 3; // Unrecognized file, could not parse
          throw err;
        }
      } else {
        err.status = 3; // Unrecognized file
        throw err;
      }
    }

    xml = null; // Save memory

    const fdxData = data.hixz || data.fdx || data.fdxz;

    let labelMap = {};

    const lcbCookbookNamesById = fetchDeepProp(fdxData, "Cookbook")
      .filter(
        (lcbCookbook) =>
          lcbCookbook &&
          lcbCookbook._attributes &&
          lcbCookbook._attributes.Name &&
          lcbCookbook._attributes.ID,
      )
      .reduce((acc, lcbCookbook) => {
        acc[lcbCookbook._attributes.ID] = lcbCookbook._attributes.Name;
        return acc;
      }, {});

    const pendingRecipes = fetchDeepProp(fdxData, "Recipe").map((recipe) => {
      let description = "";
      let notes = [];

      // Add comments to notes
      if (recipe._attributes.Comments) notes.push(recipe._attributes.Comments);

      let recipeTips = fetchDeepProp(recipe, "RecipeTip")
        .filter((lcbTip) => lcbTip && lcbTip._text)
        .map((lcbTip) => lcbTip._text);

      const authorNotes = fetchDeepProp(recipe, "RecipeAuthorNote").map(
        (authorNote) => authorNote._text,
      );

      // Add "author notes" to description or notes depending on length
      if (authorNotes.length == 1 && authorNotes[0].length <= 150)
        description = authorNotes[0];
      else if (authorNotes.length > 0) notes = [...notes, ...authorNotes];

      // Add recipeTips and join with double return
      notes = [...notes, ...recipeTips].join("\r\n\r\n");

      let totalTime = (recipe._attributes.ReadyInTime || "").toString().trim();
      if (recipe._attributes.CookingTime) {
        totalTime += ` (${(recipe._attributes.CookingTime || "")
          .toString()
          .trim()} cooking time)`;
      }
      totalTime = totalTime.trim();

      let ingredients = fetchDeepProp(recipe, "RecipeIngredient")
        .map((lcbIngredient) => lcbIngredient._attributes)
        .filter((lcbIngredient) => lcbIngredient)
        .map(
          (lcbIngredient) =>
            `${lcbIngredient.Quantity || ""} ${lcbIngredient.Unit || ""} ${
              lcbIngredient.Ingredient || ""
            }`,
        )
        .join("\r\n");

      let instructions = fetchDeepProp(recipe, "RecipeProcedure")
        .map((lcbInstruction) => lcbInstruction.ProcedureText._text)
        .join("\r\n");

      let rYield =
        recipe._attributes.Servings && recipe._attributes.Servings.length > 0
          ? `${recipe._attributes.Servings} servings`
          : null;

      let lcbRecipeLabels = [
        ...new Set([
          ...(recipe._attributes.RecipeTypes || "")
            .split(",")
            .map((el) => el.trim().toLowerCase()),
          ...[lcbCookbookNamesById[recipe.CookbookID] || ""].map((el) =>
            el.trim().toLowerCase(),
          ),
        ]),
      ]
        .filter((el) => el && el.length > 0)
        .map((el) => Util.cleanLabelTitle(el));

      return {
        model: {
          userId: runConfig.userId,
          title: recipe._attributes.Name,
          description: description || "",
          yield: rYield || "",
          activeTime: recipe._attributes.PreparationTime || "",
          totalTime: totalTime || "",
          source: recipe._attributes.Source || "",
          url: recipe._attributes.WebPage || "",
          notes: notes || "",
          ingredients: ingredients || "",
          instructions: instructions || "",
          folder: "main",
          fromUserId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        original: recipe,
        lcbRecipeLabels,
        images: [],
      };
    });

    await sequelize.transaction(async (t) => {
      let recipesWithImages = runConfig.excludeImages
        ? []
        : pendingRecipes
            .map((pendingRecipe) => {
              pendingRecipe.imageRefs = fetchDeepProp(
                pendingRecipe.original,
                "RecipeImage",
              );
              return pendingRecipe;
            })
            .filter((e) => e.imageRefs.length > 0);

      let i,
        chunkedRecipesWithImages = [],
        chunk = 50;
      for (i = 0; i < recipesWithImages.length; i += chunk) {
        chunkedRecipesWithImages.push(recipesWithImages.slice(i, i + chunk));
      }

      await chunkedRecipesWithImages.reduce((acc, lcbRecipeChunk) => {
        return acc.then(() => {
          return Promise.all(
            lcbRecipeChunk.map((lcbRecipe) => {
              let imageRefs = lcbRecipe.imageRefs;

              if (imageRefs.length == 0) return;

              if (!runConfig.multipleImages) imageRefs.splice(1); // Remove all but first image

              return Promise.all(
                lcbRecipe.imageRefs.map((imageRef) => {
                  if (imageRef._text) {
                    return writeImageBuffer(
                      ObjectTypes.RECIPE_IMAGE,
                      Buffer.from(imageRef._text, "base64"),
                      false,
                    )
                      .then((image) => {
                        lcbRecipe.images.push(image);
                      })
                      .catch(() => {
                        // Do nothing
                      });
                  }

                  // let possibleFileNameRegex = imageFileNames.join('|')
                  let possibleFileNameRegex = imageRef._attributes.FileName;

                  let possibleImageFiles = UtilService.findFilesByRegex(
                    extractPath,
                    new RegExp(`(${possibleFileNameRegex})$`, "i"),
                  );

                  if (possibleImageFiles.length == 0) return;

                  return writeImageFile(
                    ObjectTypes.RECIPE_IMAGE,
                    possibleImageFiles[0],
                    false,
                  )
                    .then((image) => {
                      lcbRecipe.images.push(image);
                    })
                    .catch(() => {
                      // Do nothing
                    });
                }),
              );
            }),
          );
        });
      }, Promise.resolve());

      let recipes = await Recipe.bulkCreate(
        pendingRecipes.map((el) => el.model),
        {
          returning: true,
          transaction: t,
        },
      );

      const pendingRecipeImages = [];
      recipes.map((recipe, idx) => {
        pendingRecipeImages.push(
          ...pendingRecipes[idx].images.map((image, idx) => ({
            image,
            recipeId: recipe.id,
            order: idx, // This may need to be improved - currently it just depends on which image finishes uploading first
          })),
        );

        pendingRecipes[idx].lcbRecipeLabels.map((lcbLabelName) => {
          labelMap[lcbLabelName] = labelMap[lcbLabelName] || [];
          labelMap[lcbLabelName].push(recipe.id);
        });
      });

      await Promise.all(
        Object.keys(labelMap).map((lcbLabelName) => {
          return Label.findOrCreate({
            where: {
              userId: runConfig.userId,
              title: lcbLabelName,
            },
            transaction: t,
          }).then((labels) => {
            return Recipe_Label.bulkCreate(
              labelMap[lcbLabelName].map((recipeId) => {
                return {
                  labelId: labels[0].id,
                  recipeId,
                };
              }),
              {
                ignoreDuplicates: true,
                transaction: t,
              },
            );
          });
        }),
      );

      const savedImages = await Image.bulkCreate(
        pendingRecipeImages.map((p) => ({
          userId: runConfig.userId,
          location: p.image.location,
          key: p.image.key,
          json: p.image,
        })),
        {
          returning: true,
          transaction: t,
        },
      );

      await Recipe_Image.bulkCreate(
        pendingRecipeImages.map((p, idx) => ({
          recipeId: p.recipeId,
          imageId: savedImages[idx].id,
          order: p.order,
        })),
        {
          transaction: t,
        },
      );
    });

    exit(0);
  } catch (e) {
    console.log("Couldn't handle lcb upload 2", e);
    logError(e);

    exit(e?.status || 1);
  }
}

main();
