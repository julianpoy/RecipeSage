import * as express from "express";
const router = express.Router();
import * as xmljs from "xml-js";
import * as fs from "fs-extra";

import * as MiddlewareService from "../services/middleware.js";
import { fetchURL } from "@recipesage/util/server/general";
import { exportToPDF } from "../services/data-export/pdf";
import * as JSONLDService from "../services/json-ld.js";
import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";

import { Recipe, User, Label, Image } from "../models/index.js";

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

export default router;
