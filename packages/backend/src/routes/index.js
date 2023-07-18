import * as express from "express";
const router = express.Router();
import * as cors from "cors";
import * as multer from "multer";
import * as fs from "fs-extra";
import * as extract from "extract-zip";
import { spawn } from "child_process";
import { performance } from "perf_hooks";
import * as semver from "semver";
import * as path from "path";
import fetch from "node-fetch";
import * as xmljs from "xml-js";

// DB
import {
  sequelize,
  Recipe,
  Label,
  Recipe_Label,
  Image,
  Recipe_Image,
} from "../models/index.js";

import { validateSession, validateUser } from "../services/middleware.js";
import * as UtilService from "../services/util.js";
import { writeImageURL, writeImageBuffer } from "../services/storage/image.ts";
import { ObjectTypes } from "../services/storage/shared.ts";
import * as SearchService from "@recipesage/trpc";
import * as SubscriptionsService from "../services/subscriptions.js";
import * as JobTrackerService from "../services/job-tracker.js";

router.get("/", function (req, res) {
  res.render("index", { version: process.env.VERSION });
});

const MIN_SUPPORTED_FRONTEND_VERSION = ">=2.0.0";
router.get("/versioncheck", (req, res) => {
  let supported = false;
  if (req.query.version) {
    const version = semver.coerce(req.query.version);
    supported = semver.satisfies(version, MIN_SUPPORTED_FRONTEND_VERSION);
  }

  if (["development", "staging"].includes(req.query.version)) supported = true;

  res.status(200).json({
    supported,
  });
});

router.get(
  "/scrape/pepperplate",
  cors(),
  validateSession(["user"]),
  async (req, res, next) => {
    const XML_CHAR_MAP = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
    };

    function escapeXml(s) {
      return s.replace(/[<>&"']/g, function (ch) {
        return XML_CHAR_MAP[ch];
      });
    }

    try {
      const username = escapeXml(req.query.username.trim());
      const password = escapeXml(req.query.password);

      const authResponse = await fetch(
        "http://www.pepperplate.com/services/syncmanager5.asmx",
        {
          method: "POST",
          headers: {
            "content-type": "text/xml",
          },
          body: `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"
      xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <GenerateLoginToken xmlns="http://api.pepperplate.com/">
            <email>${username}</email>
            <password>${password}</password>
          </GenerateLoginToken>
        </soap:Body>
      </soap:Envelope>
      `,
        }
      );

      const authResponseText = await authResponse.text();

      if (authResponseText.indexOf("<Status>UnknownEmail</Status>") > -1) {
        return res.status(406).send("Incorrect username");
      } else if (
        authResponseText.indexOf("<Status>IncorrectPassword</Status>") > -1
      ) {
        return res.status(406).send("Incorrect password");
      }

      const userToken = authResponseText.match(/<Token>(.*)<\/Token>/)[1];

      let recipes = [];

      let syncToken;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const syncResponse = await fetch(
          "http://www.pepperplate.com/services/syncmanager5.asmx",
          {
            method: "POST",
            headers: {
              "content-type": "text/xml",
            },
            body: `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"
        xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <RetrieveRecipes xmlns="http://api.pepperplate.com/">
              <userToken>${userToken}</userToken>
              ${syncToken ? `<syncToken>${syncToken}</syncToken>` : ""}
              <count>50</count>
            </RetrieveRecipes>
          </soap:Body>
        </soap:Envelope>
        `,
          }
        );

        const syncResponseText = await syncResponse.text();

        console.log("repeat");

        const recipeJson = JSON.parse(
          xmljs.xml2json(syncResponseText, { compact: true, spaces: 4 })
        );

        syncToken =
          recipeJson["soap:Envelope"]["soap:Body"]["RetrieveRecipesResponse"][
            "RetrieveRecipesResult"
          ]["SynchronizationToken"]._text;

        console.log("new sync token!", syncToken);

        const items =
          recipeJson["soap:Envelope"]["soap:Body"]["RetrieveRecipesResponse"][
            "RetrieveRecipesResult"
          ]["Items"]["RecipeSync"];

        if (items && items.length > 0) {
          recipes.push(...items);
        } else {
          break;
        }

        if (!syncToken) {
          break;
        }
      }

      recipes = recipes.filter((pepperRecipe) => {
        return (pepperRecipe.Delete || {})._text !== "true";
      });

      const objToArr = (item) => {
        if (!item) return [];
        if (item.length || item.length === 0) return item;
        return [item];
      };

      await sequelize.transaction(async (transaction) => {
        const savedRecipes = await Recipe.bulkCreate(
          recipes.map((pepperRecipe) => {
            const ingredientGroups = objToArr(
              (pepperRecipe.Ingredients || {}).IngredientSyncGroup
            );

            const finalIngredients = ingredientGroups
              .sort(
                (a, b) =>
                  parseInt((a.DisplayOrder || {})._text || 0, 10) -
                  parseInt((b.DisplayOrder || {})._text || 0, 10)
              )
              .map((ingredientGroup) => {
                let ingredients = [];
                if (ingredientGroup.Title && ingredientGroup.Title._text) {
                  ingredients.push(`[${ingredientGroup.Title._text}]`);
                }
                const innerIngredients = objToArr(
                  (ingredientGroup.Ingredients || {}).IngredientSync
                )
                  .sort(
                    (a, b) =>
                      parseInt((a.DisplayOrder || {})._text || 0, 10) -
                      parseInt((b.DisplayOrder || {})._text || 0, 10)
                  )
                  .map((ingredient) =>
                    (
                      ((ingredient.Quantity || {})._text || "") +
                      " " +
                      ingredient.Text._text
                    ).trim()
                  )
                  .join("\r\n");
                return [...ingredients, innerIngredients].join("\r\n");
              })
              .join("\r\n");

            const directionGroups = objToArr(
              (pepperRecipe.Directions || {}).DirectionSyncGroup
            );

            const finalDirections = directionGroups
              .sort(
                (a, b) =>
                  parseInt((a.DisplayOrder || {})._text || 0, 10) -
                  parseInt((b.DisplayOrder || {})._text || 0, 10)
              )
              .map((directionGroup) => {
                let directions = [];
                if (directionGroup.Title && directionGroup.Title._text) {
                  directions.push(`[${directionGroup.Title._text}]`);
                }
                const innerDirections = objToArr(
                  (directionGroup.Directions || {}).DirectionSync
                )
                  .sort(
                    (a, b) =>
                      parseInt((a.DisplayOrder || {})._text || 0, 10) -
                      parseInt((b.DisplayOrder || {})._text || 0, 10)
                  )
                  .map((direction) => direction.Text._text)
                  .join("\r\n");
                return [...directions, innerDirections].join("\r\n");
              })
              .join("\r\n");

            return {
              userId: res.locals.session.userId,
              title: pepperRecipe.Title._text,
              description: (pepperRecipe.Description || {})._text || "",
              notes: (pepperRecipe.Note || {})._text || "",
              ingredients: finalIngredients,
              instructions: finalDirections,
              totalTime: (pepperRecipe.TotalTime || {})._text || "",
              activeTime: (pepperRecipe.ActiveTime || {})._text || "",
              source:
                (pepperRecipe.Source || {})._text ||
                (pepperRecipe.ManualSource || {})._text ||
                "",
              url: (pepperRecipe.Url || {})._text || "",
              yield: (pepperRecipe.Yield || {})._text || "",
              folder: "main",
              fromUserId: null,
            };
          }),
          {
            transaction,
            returning: true,
          }
        );

        const recipeIdsByLabelTitle = recipes.reduce(
          (acc, pepperRecipe, idx) => {
            try {
              objToArr((pepperRecipe.Tags || {}).TagSync).map((tag) => {
                // Avoid dupes potentially returned by PP API
                const labelTitle = UtilService.cleanLabelTitle(tag.Text._text);

                acc[labelTitle] = acc[labelTitle] || [];
                // Avoid dupes potentially returned by PP API
                if (!acc[labelTitle].includes(savedRecipes[idx].id)) {
                  acc[labelTitle].push(savedRecipes[idx].id);
                }
              });
            } catch (e) {
              // Do nothing
            }
            return acc;
          },
          {}
        );

        await Promise.all(
          Object.keys(recipeIdsByLabelTitle)
            .filter((labelName) => labelName && labelName.length > 0)
            .map((labelName) => {
              return Label.findOrCreate({
                where: {
                  userId: res.locals.session.userId,
                  title: labelName,
                },
                transaction,
              }).then((labels) => {
                return Recipe_Label.bulkCreate(
                  recipeIdsByLabelTitle[labelName].map((recipeId) => {
                    return {
                      labelId: labels[0].id,
                      recipeId,
                    };
                  }),
                  {
                    ignoreDuplicates: true,
                    transaction,
                  }
                );
              });
            })
        );

        const PEPPERPLATE_IMG_CHUNK_SIZE = 50;

        await UtilService.executeInChunks(
          recipes.map((pepperRecipe) => () => {
            if (pepperRecipe.ImageUrl && pepperRecipe.ImageUrl._text) {
              return writeImageURL(
                ObjectTypes.RECIPE_IMAGE,
                pepperRecipe.ImageUrl._text,
                false
              )
                .then((image) => {
                  pepperRecipe.image = image;
                })
                .catch(() => {
                  // Do nothing
                });
            }
          }),
          PEPPERPLATE_IMG_CHUNK_SIZE
        );

        const pendingImageData = [];
        savedRecipes.map((savedRecipe, idx) => {
          if (recipes[idx].image) {
            pendingImageData.push({
              image: recipes[idx].image,
              recipeId: savedRecipe.id,
              order: 0, // Pepperplate only supports one image
            });
          }
        });

        const savedImages = await Image.bulkCreate(
          pendingImageData.map((p) => ({
            userId: res.locals.session.userId,
            location: p.image.location,
            key: p.image.key,
            json: p.image,
          })),
          {
            returning: true,
            transaction,
          }
        );

        await Recipe_Image.bulkCreate(
          pendingImageData.map((p, idx) => ({
            recipeId: p.recipeId,
            imageId: savedImages[idx].id,
            order: p.order,
          })),
          {
            transaction,
          }
        );

        await SearchService.indexRecipes(savedRecipes);
      });

      res.status(200).json({
        msg: "Import complete",
      });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/import/livingcookbook",
  cors(),
  validateSession(["user"]),
  validateUser,
  multer({
    dest: "/tmp/chefbook-lcb-import/",
  }).single("lcbdb"),
  async (req, res, next) => {
    if (!req.file) {
      res.status(400).send("Must include a file with the key lcbdb");
    } else {
      console.log(req.file.path);
    }

    const canImportMultipleImages =
      await SubscriptionsService.userHasCapability(
        res.locals.session.userId,
        SubscriptionsService.CAPABILITIES.MULTIPLE_IMAGES
      );

    let optionalFlags = [];
    if (req.query.excludeImages) optionalFlags.push("--excludeImages");
    if (req.query.includeStockRecipes)
      optionalFlags.push("--includeStockRecipes");
    if (req.query.includeTechniques) optionalFlags.push("--includeTechniques");
    if (canImportMultipleImages) optionalFlags.push("--multipleImages");

    const job = {
      complete: false,
    };
    JobTrackerService.addJob(job);

    let lcbImportJob = spawn("node_modules/ts-node/dist/bin.js", [
      "--project",
      "packages/backend/tsconfig.json",
      "packages/backend/src/lcbimport.app.js",
      req.file.path,
      res.locals.session.userId,
      ...optionalFlags,
    ]);
    lcbImportJob.stderr.setEncoding("utf8");
    lcbImportJob.stderr.on("data", (err) => {
      console.error(err);
    });
    lcbImportJob.stdout.setEncoding("utf8");
    lcbImportJob.stdout.on("data", (msg) => {
      console.log(msg);
    });
    lcbImportJob.on("close", async (code) => {
      switch (code) {
        case 0: {
          const recipes = await Recipe.findAll({
            where: {
              userId: res.locals.session.userId,
            },
          });

          await SearchService.indexRecipes(recipes);

          res.status(200).json({
            msg: "Ok",
          });
          break;
        }
        case 3: {
          let badFileErr = new Error(
            "Bad file format (not in .LCB ZIP format)"
          );
          badFileErr.status = 406;
          next(badFileErr);
          break;
        }
        default: {
          let unexpectedErr = new Error("Import failed");
          unexpectedErr.status = 500;
          next(unexpectedErr);
          break;
        }
      }
      job.complete = true;
    });
  }
);

router.post(
  "/import/fdxz",
  cors(),
  validateSession(["user"]),
  validateUser,
  multer({
    dest: "/tmp/chefbook-fdxz-import/",
  }).single("fdxzdb"),
  async (req, res, next) => {
    if (!req.file) {
      res.status(400).send("Must include a file with the key fdxzdb");
    } else {
      console.log(req.file.path);
    }

    const canImportMultipleImages =
      await SubscriptionsService.userHasCapability(
        res.locals.session.userId,
        SubscriptionsService.CAPABILITIES.MULTIPLE_IMAGES
      );

    let optionalFlags = [];
    if (req.query.excludeImages) optionalFlags.push("--excludeImages");
    if (canImportMultipleImages) optionalFlags.push("--multipleImages");

    const job = {
      complete: false,
    };
    JobTrackerService.addJob(job);

    let lcbImportJob = spawn("node_modules/ts-node/dist/bin.js", [
      "--project",
      "packages/backend/tsconfig.json",
      "packages/backend/src/fdxzimport.app.js",
      req.file.path,
      res.locals.session.userId,
      ...optionalFlags,
    ]);
    lcbImportJob.stderr.setEncoding("utf8");
    lcbImportJob.stderr.on("data", (err) => {
      console.error(err);
    });
    lcbImportJob.stdout.setEncoding("utf8");
    lcbImportJob.stdout.on("data", (msg) => {
      console.log(msg);
    });
    lcbImportJob.on("close", async (code) => {
      switch (code) {
        case 0: {
          const recipes = await Recipe.findAll({
            where: {
              userId: res.locals.session.userId,
            },
          });

          await SearchService.indexRecipes(recipes);

          res.status(200).json({
            msg: "Ok",
          });
          break;
        }
        case 3: {
          let badFileErr = new Error(
            "Bad file format (not in .FDX or .FDXZ format)"
          );
          badFileErr.status = 406;
          next(badFileErr);
          break;
        }
        default: {
          let unexpectedErr = new Error("Import failed");
          unexpectedErr.status = 500;
          next(unexpectedErr);
          break;
        }
      }
      job.complete = true;
    });

    const recipes = await Recipe.findAll({
      where: {
        userId: res.locals.session.userId,
      },
    });

    await SearchService.indexRecipes(recipes);
  }
);

router.post(
  "/import/paprika",
  cors(),
  validateSession(["user"]),
  validateUser,
  multer({
    dest: "/tmp/paprika-import/",
  }).single("paprikadb"),
  async (req, res, next) => {
    if (!req.file) {
      res.status(400).send("Must include a file with the key lcbdb");
    } else {
      console.log(req.file.path);
    }

    let metrics = {
      t0: performance.now(),
      tExtracted: null,
      tRecipesProcessed: null,
      tRecipesSaved: null,
      tLabelsSaved: null,
    };

    let zipPath = req.file.path;
    let extractPath = zipPath + "-extract";

    extract(zipPath, { dir: extractPath })
      .then(() => {
        metrics.tExtracted = performance.now();

        let labelMap = {};
        let pendingRecipes = [];
        return sequelize.transaction((t) => {
          return fs.readdir(extractPath).then((fileNames) => {
            return fileNames
              .reduce((acc, fileName) => {
                return acc.then(() => {
                  let filePath = path.join(extractPath, fileName);

                  return fs.readFile(filePath).then((fileBuf) => {
                    return UtilService.gunzip(fileBuf).then((data) => {
                      let recipeData = JSON.parse(data.toString());

                      let imageP = recipeData.photo_data
                        ? writeImageBuffer(
                            ObjectTypes.RECIPE_IMAGE,
                            Buffer.from(recipeData.photo_data, "base64"),
                            true
                          )
                        : Promise.resolve();

                      return imageP.then((image) => {
                        let notes = [
                          recipeData.notes,
                          recipeData.nutritional_info
                            ? `Nutritional Info: ${recipeData.difficulty}`
                            : "",
                          recipeData.difficulty
                            ? `Difficulty: ${recipeData.difficulty}`
                            : "",
                          recipeData.rating
                            ? `Rating: ${recipeData.rating}`
                            : "",
                        ]
                          .filter((e) => e && e.length > 0)
                          .join("\r\n");

                        let totalTime = [
                          recipeData.total_time,
                          recipeData.cook_time
                            ? `(${recipeData.cook_time} cooking time)`
                            : "",
                        ]
                          .filter((e) => e)
                          .join(" ");

                        pendingRecipes.push({
                          model: {
                            userId: res.locals.session.userId,
                            title: recipeData.name,
                            image,
                            description: recipeData.description,
                            ingredients: recipeData.ingredients,
                            instructions: recipeData.directions,
                            yield: recipeData.servings,
                            totalTime,
                            activeTime: recipeData.prep_time,
                            notes,
                            source: recipeData.source,
                            folder: "main",
                            fromUserId: null,
                            url: recipeData.source_url,
                          },
                          labels: (recipeData.categories || [])
                            .map((e) => UtilService.cleanLabelTitle(e))
                            .filter((e) => e && e.length > 0),
                        });
                      });
                    });
                  });
                });
              }, Promise.resolve())
              .then(() => {
                metrics.tRecipesProcessed = performance.now();

                return Recipe.bulkCreate(
                  pendingRecipes.map((el) => el.model),
                  {
                    returning: true,
                    transaction: t,
                  }
                ).then((recipes) => {
                  recipes.map((recipe, idx) => {
                    pendingRecipes[idx].labels.map((labelTitle) => {
                      labelMap[labelTitle] = labelMap[labelTitle] || [];
                      labelMap[labelTitle].push(recipe.id);
                    });
                  });
                });
              })
              .then(() => {
                metrics.tRecipesSaved = performance.now();

                return Promise.all(
                  Object.keys(labelMap).map((labelTitle) => {
                    return Label.findOrCreate({
                      where: {
                        userId: res.locals.session.userId,
                        title: labelTitle,
                      },
                      transaction: t,
                    }).then((labels) => {
                      return Recipe_Label.bulkCreate(
                        labelMap[labelTitle].map((recipeId) => {
                          return {
                            labelId: labels[0].id,
                            recipeId,
                          };
                        }),
                        {
                          ignoreDuplicates: true,
                          transaction: t,
                        }
                      );
                    });
                  })
                );
              });
          });
        });
      })
      .then(async () => {
        metrics.tLabelsSaved = performance.now();

        metrics.performance = {
          tExtract: Math.floor(metrics.tExtracted - metrics.t0),
          tRecipesProcess: Math.floor(
            metrics.tRecipesProcessed - metrics.tExtracted
          ),
          tRecipesSave: Math.floor(
            metrics.tRecipesSaved - metrics.tRecipesProcessed
          ),
          tLabelsSave: Math.floor(metrics.tLabelsSaved - metrics.tRecipesSaved),
        };

        const recipes = await Recipe.findAll({
          where: {
            userId: res.locals.session.userId,
          },
        });

        await SearchService.indexRecipes(recipes);

        res.status(201).json({});
      })
      .catch((err) => {
        if (
          err.message === "end of central directory record signature not found"
        )
          err.status = 406;
        fs.removeSync(zipPath);
        fs.removeSync(extractPath);
        next(err);
      });
  }
);

router.get("/embed/recipe/:recipeId", (req, res) => {
  res.redirect(
    302,
    `/api/print/${req.params.recipeId}${req._parsedUrl.search}`
  );
});

export default router;
