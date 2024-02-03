import * as express from "express";
const router = express.Router();
import * as pLimit from "p-limit";
import * as xmljs from "xml-js";
import * as multer from "multer";
import * as fs from "fs-extra";
import * as fsPromises from "fs/promises";
import * as extract from "extract-zip";
import * as path from "path";

import * as MiddlewareService from "../services/middleware.js";
import * as SubscriptionsService from "../services/subscriptions.js";
import * as Util from "@recipesage/util";
import * as UtilService from "../services/util.js";
import * as SearchService from "@recipesage/trpc";
import {
  writeImageFile,
  writeImageURL,
  writeImageBuffer,
} from "../services/storage/image";
import { ObjectTypes } from "../services/storage/shared.ts";
import { exportToPDF } from "../services/data-export/pdf";
import * as JSONLDService from "../services/json-ld.js";
import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";
import { fetchURL } from "../services/fetch";

import {
  Recipe,
  User,
  Label,
  Recipe_Label,
  Image,
  Recipe_Image,
  sequelize,
} from "../models/index.js";

const getRecipeDataForExport = async (userId) => {
  const results = await Recipe.findAll({
    where: {
      userId,
    },
    attributes: [
      "id",
      "title",
      "description",
      "yield",
      "activeTime",
      "totalTime",
      "source",
      "url",
      "notes",
      "ingredients",
      "instructions",
      "folder",
      "createdAt",
      "updatedAt",
      "userId",
    ],
    include: [
      {
        model: User,
        as: "fromUser",
        attributes: ["name", "email", "handle"],
      },
      {
        model: Label,
        as: "labels",
        attributes: ["title"],
      },
      {
        model: Image,
        as: "images",
        attributes: ["id", "location"],
      },
    ],
    order: [["title", "ASC"]],
  });

  const recipeData = results.map((e) => e.toJSON());

  recipeData.forEach((recipe) =>
    recipe.labels.forEach((label) => delete label.Recipe_Label),
  );
  recipeData.forEach((recipe) =>
    recipe.images.forEach((image) => delete image.Recipe_Image),
  );

  if (process.env.NODE_ENV === "selfhost") {
    for (const recipe of recipeData) {
      const recipeImages = [];
      for (const image of recipe.images) {
        const { location } = image;
        if (location.startsWith("http://") || location.startsWith("https://")) {
          recipeImages.push(image);
          continue;
        }

        if (location.startsWith("/minio/")) {
          const path =
            process.env.AWS_ENDPOINT + location.replace("/minio/", "");
          const data = await fetchURL(path);
          const buffer = await data.buffer();
          const base64 = buffer.toString("base64");

          image.location = `data:image/png;base64,${base64}`;
          recipeImages.push(image);
          continue;
        }

        if (location.startsWith("/") || location.startsWith("api/")) {
          const data = fs.readFileSync(
            location.replace(
              /^\/?api\/images\/filesystem/,
              process.env.FILESYSTEM_STORAGE_PATH,
            ),
          );
          const base64 = data.toString("base64");

          image.location = `data:image/png;base64,${base64}`;
          recipeImages.push(image);
          continue;
        }

        throw new Error("Unrecognized URL format: " + image.location);
      }
      recipe.images = recipeImages;
    }
  }

  return recipeData;
};

router.get(
  "/export/xml",
  MiddlewareService.validateSession(["user"]),
  async (req, res, next) => {
    try {
      const recipes = await getRecipeDataForExport(res.locals.session.userId);

      const exportData = {
        data: {
          recipe: recipes,
        },
      };

      const xml = xmljs.json2xml(exportData, {
        compact: true,
        ignoreComment: true,
        spaces: 4,
      });

      if (req.query.download === "true")
        res.setHeader(
          "Content-disposition",
          `attachment; filename=recipesage-data-${Date.now()}.xml`,
        );
      res.setHeader("Content-type", "text/xml");
      res.write(xml);
      res.end();
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  "/export/txt",
  MiddlewareService.validateSession(["user"]),
  async (req, res, next) => {
    try {
      const recipes = await getRecipeDataForExport(res.locals.session.userId);

      const exportData = {
        recipes,
      };

      let data = "==== Recipes ====\n\n";

      for (let i = 0; i < exportData.recipes.length; i++) {
        let recipe = exportData.recipes[i];

        recipe.labels = recipe.labels.map((label) => label.title).join(", ");

        recipe.images = recipe.images.map((image) => image.location).join(", ");

        delete recipe.fromUser;

        for (const key in recipe) {
          data += key + ": ";
          data += recipe[key] + "\r\n";
        }
        data += "\r\n";
      }

      res.charset = "UTF-8";

      if (req.query.download === "true")
        res.setHeader(
          "Content-disposition",
          `attachment; filename=recipesage-data-${Date.now()}.txt`,
        );
      res.setHeader("Content-type", "text/plain");
      res.write(data);
      res.end();
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  "/export/pdf",
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const recipes = await getRecipeDataForExport(res.locals.session.userId);

    await exportToPDF(recipes, res, {
      includeImages: req.query.includeImages === "true",
      includeImageUrls: req.query.includeImageUrls !== "false",
    });
  }),
);

router.get(
  "/export/json-ld",
  MiddlewareService.validateSession(["user"]),
  async (req, res, next) => {
    try {
      const recipes = await getRecipeDataForExport(res.locals.session.userId);

      const jsonLD = recipes.map((e) => JSONLDService.recipeToJSONLD(e));

      const data = JSON.stringify(jsonLD);

      if (req.query.download === "true")
        res.setHeader(
          "Content-disposition",
          `attachment; filename=recipesage-data-${Date.now()}.json-ld.json`,
        );
      res.setHeader("Content-type", "application/ld+json");
      res.write(data);
      res.end();
    } catch (e) {
      next(e);
    }
  },
);

const CONCURRENT_IMAGE_IMPORTS = 2;
const MAX_IMAGES = 10;
const MAX_IMPORT_LIMIT = 10000; // A reasonable cutoff to make sure we don't kill the server for extremely large imports
const importStandardizedRecipes = async (userId, recipesToImport) => {
  const highResConversion = await SubscriptionsService.userHasCapability(
    userId,
    SubscriptionsService.Capabilities.HighResImages,
  );

  const canUploadMultipleImages = await SubscriptionsService.userHasCapability(
    userId,
    SubscriptionsService.Capabilities.MultipleImages,
  );

  if (recipesToImport.length > MAX_IMPORT_LIMIT) {
    throw new Error("Too many recipes to import in one batch");
  }

  return sequelize.transaction(async (transaction) => {
    const limit = pLimit(CONCURRENT_IMAGE_IMPORTS);

    const recipes = await Recipe.bulkCreate(
      recipesToImport.map((recipe) => ({
        title: recipe.title,
        description: recipe.description || "",
        yield: recipe.yield || "",
        activeTime: recipe.activeTime || "",
        totalTime: recipe.totalTime || "",
        source: recipe.source || "",
        url: recipe.url || "",
        notes: recipe.notes || "",
        ingredients: recipe.ingredients || "",
        instructions: recipe.instructions || "",
        folder: ["inbox", "main"].includes(recipe.folder)
          ? recipe.folder
          : "main",
        userId,
      })),
      {
        returning: true,
        transaction,
      },
    );

    const labelMap = {};

    recipesToImport.forEach((recipeImport, idx) => {
      const recipe = recipes[idx];
      recipeImport.labels.map((labelTitle) => {
        labelTitle = Util.cleanLabelTitle(labelTitle);
        labelMap[labelTitle] = labelMap[labelTitle] || [];
        labelMap[labelTitle].push(recipe.id);
      });
    });

    for (const labelTitle of Object.keys(labelMap)) {
      const [label] = await Label.findOrCreate({
        where: {
          userId,
          title: labelTitle.substring(0, 255),
        },
        transaction,
      });

      await Recipe_Label.bulkCreate(
        labelMap[labelTitle].map((recipeId) => {
          return {
            labelId: label.id,
            recipeId,
          };
        }),
        {
          ignoreDuplicates: true,
          transaction,
        },
      );
    }

    const imagesByRecipeIdx = await Promise.all(
      recipesToImport.map(async (el) => {
        if (!el.images) return [];

        return await Promise.all(
          el.images
            .filter((_, idx) => idx === 0 || canUploadMultipleImages)
            .filter((_, idx) => idx < MAX_IMAGES)
            .map((image) =>
              limit(async () => {
                if (typeof image === "object") {
                  return await writeImageBuffer(
                    ObjectTypes.RECIPE_IMAGE,
                    image,
                    highResConversion,
                  );
                } else if (
                  image.startsWith("http:") ||
                  image.startsWith("https:")
                ) {
                  try {
                    return await writeImageURL(
                      ObjectTypes.RECIPE_IMAGE,
                      image,
                      highResConversion,
                    );
                  } catch (e) {
                    console.error(e);
                  }
                } else {
                  return await writeImageFile(
                    ObjectTypes.RECIPE_IMAGE,
                    image,
                    highResConversion,
                  );
                }
              }),
            ),
        );
      }),
    );

    console.log(imagesByRecipeIdx);

    const pendingImages = imagesByRecipeIdx
      .map((images, recipeIdx) =>
        images
          .filter((image) => !!image)
          .map((image, imageIdx) => ({
            image,
            recipeId: recipes[recipeIdx].id,
            order: imageIdx,
          })),
      )
      .flat()
      .filter((e) => e);

    console.log(pendingImages);

    const savedImages = await Image.bulkCreate(
      pendingImages.map((p) => ({
        userId,
        location: p.image.location,
        key: p.image.key,
        json: p.image,
      })),
      {
        returning: true,
        transaction,
      },
    );

    await Recipe_Image.bulkCreate(
      pendingImages.map((p, idx) => ({
        recipeId: p.recipeId,
        imageId: savedImages[idx].id,
        order: p.order,
      })),
      {
        transaction,
      },
    );
  });
};

router.post(
  "/import/json-ld",
  MiddlewareService.validateSession(["user"]),
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: "100MB", files: 1 },
  }).single("jsonLD"),
  async (req, res, next) => {
    try {
      let jsonLD = req.body.jsonLD;

      if (!jsonLD && req.file) jsonLD = JSON.parse(req.file.buffer.toString());

      if (!jsonLD)
        return res
          .status(400)
          .send("No data. Only Recipe types are supported at this time.");

      if (!jsonLD.length && jsonLD["@type"] === "Recipe") jsonLD = [jsonLD];

      jsonLD = jsonLD.filter((el) => el["@type"] === "Recipe");

      if (!jsonLD.length)
        return res
          .status(400)
          .send("Only supports JSON-LD or array of JSON-LD with type 'Recipe'");

      const recipesToImport = jsonLD.map((ld) =>
        JSONLDService.jsonLDToRecipe(ld),
      );

      await importStandardizedRecipes(
        res.locals.session.userId,
        recipesToImport,
      );

      const recipesToIndex = await Recipe.findAll({
        where: {
          userId: res.locals.session.userId,
        },
      });

      await SearchService.indexRecipes(recipesToIndex);

      res.status(200).send("Imported");
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/import/paprika",
  MiddlewareService.validateSession(["user"]),
  multer({
    dest: "/tmp/paprika-import/",
  }).single("paprikadb"),
  async (req, res, next) => {
    let zipPath, extractPath;
    try {
      if (!req.file) {
        const badFormatError = new Error(
          "Request must include multipart file under paprikadb field",
        );
        badFormatError.status = 400;
        throw badFormatError;
      }

      zipPath = req.file.path;
      extractPath = zipPath + "-extract";

      await extract(zipPath, { dir: extractPath });

      const fileNames = await fs.readdir(extractPath);

      const recipes = [];
      for (const fileName of fileNames) {
        const filePath = path.join(extractPath, fileName);

        const fileBuf = await fs.readFile(filePath);
        const fileContents = await UtilService.gunzip(fileBuf);

        const recipeData = JSON.parse(fileContents.toString());

        const notes = [
          recipeData.notes,
          recipeData.nutritional_info
            ? `Nutritional Info: ${recipeData.difficulty}`
            : "",
          recipeData.difficulty ? `Difficulty: ${recipeData.difficulty}` : "",
          recipeData.rating ? `Rating: ${recipeData.rating}` : "",
        ]
          .filter((e) => e && e.length > 0)
          .join("\n");

        const totalTime = [
          recipeData.total_time,
          recipeData.cook_time ? `(${recipeData.cook_time} cooking time)` : "",
        ]
          .filter((e) => e)
          .join(" ");

        const labels = (recipeData.categories || [])
          .map((e) => Util.cleanLabelTitle(e))
          .filter((e) => e);

        // Supports only the first image at the moment
        const images = recipeData.photo_data
          ? [Buffer.from(recipeData.photo_data, "base64")]
          : [];

        recipes.push({
          title: recipeData.name,
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

          labels,
          images,
        });
      }

      await fs.remove(zipPath);
      await fs.remove(extractPath);

      await importStandardizedRecipes(res.locals.session.userId, recipes);

      const recipesToIndex = await Recipe.findAll({
        where: {
          userId: res.locals.session.userId,
        },
      });

      await SearchService.indexRecipes(recipesToIndex);

      res.status(201).send("Import complete");
    } catch (err) {
      if (err.message === "end of central directory record signature not found")
        err.status = 406;
      await fs.remove(zipPath);
      await fs.remove(extractPath);
      next(err);
    }
  },
);

router.post(
  "/import/cookmate",
  MiddlewareService.validateSession(["user"]),
  multer({
    dest: "/tmp/cookmate-import/",
  }).single("cookmatedb"),
  async (req, res, next) => {
    let zipPath, extractPath;
    try {
      if (!req.file) {
        const badFormatError = new Error(
          "Request must include multipart file under cookmatedb field",
        );
        badFormatError.status = 400;
        throw badFormatError;
      }

      zipPath = req.file.path;
      extractPath = zipPath + "-extract";

      await extract(zipPath, { dir: extractPath });

      const fileNames = await fs.readdir(extractPath);

      const filename = fileNames.find((filename) => filename.endsWith(".xml"));
      if (!filename) {
        const badFormatError = new Error("Bad cookmate file format");
        badFormatError.status = 400;
        throw badFormatError;
      }

      const xml = fs.readFileSync(extractPath + "/" + filename, "utf8");
      const data = JSON.parse(
        xmljs.xml2json(xml, { compact: true, spaces: 4 }),
      );

      const grabFieldText = (field) => {
        if (!field) return "";
        if (field.li) {
          return field.li.map((item) => item._text).join("\n");
        }

        return field._text || "";
      };

      const grabLabelTitles = (field) => {
        if (!field) return [];
        if (field._text) return [Util.cleanLabelTitle(field._text)];
        if (field.length)
          return field.map((item) => Util.cleanLabelTitle(item._text));

        return [];
      };

      const grabImagePaths = async (basePath, field) => {
        if (!field) return [];

        let originalPaths;
        if (field.path?._text || field._text)
          originalPaths = [field.path?._text || field._text];
        if (field.length)
          originalPaths = field.map((item) => item.path?._text || item._text);

        if (!originalPaths) return [];

        const paths = originalPaths
          .filter((e) => e)
          .map((originalPath) => originalPath.split("/").at(-1))
          .map((trimmedPath) => basePath + "/" + trimmedPath);

        const pathsOnDisk = [];
        for (const path of paths) {
          try {
            await fsPromises.stat(path);
            pathsOnDisk.push(path);
          } catch (e) {
            // Do nothing, image does not exist in backup
          }
        }

        return pathsOnDisk;
      };

      const recipes = await Promise.all(
        data.cookbook.recipe.map(async (recipe) => ({
          title: grabFieldText(recipe.title),
          description: grabFieldText(recipe.description),
          ingredients: grabFieldText(recipe.ingredient),
          instructions: grabFieldText(recipe.recipetext),
          yield: grabFieldText(recipe.quantity),
          totalTime: grabFieldText(recipe.totaltime),
          activeTime: grabFieldText(recipe.preptime),
          notes: grabFieldText(recipe.comments),
          source: grabFieldText(recipe.source),
          folder: "main",
          fromUserId: null,
          url: grabFieldText(recipe.url),

          labels: grabLabelTitles(recipe.category),
          images: [
            ...(await grabImagePaths(
              extractPath + "/images",
              recipe.imagepath,
            )),
            ...(await grabImagePaths(extractPath + "/images", recipe.image)),
          ],
        })),
      );

      await importStandardizedRecipes(res.locals.session.userId, recipes);

      await fs.remove(zipPath);
      await fs.remove(extractPath);

      const recipesToIndex = await Recipe.findAll({
        where: {
          userId: res.locals.session.userId,
        },
      });

      await SearchService.indexRecipes(recipesToIndex);

      res.status(201).send("Import complete");
    } catch (err) {
      if (err.message === "end of central directory record signature not found")
        err.status = 406;
      await fs.remove(zipPath);
      await fs.remove(extractPath);
      next(err);
    }
  },
);

export default router;
