import express from "express";
const router = express.Router();
import sanitizeHtml from "sanitize-html";

// DB
import { Recipe, Image, Label } from "../models/index.js";

// Service
import * as MiddlewareService from "../services/middleware.js";
import * as UtilService from "../services/util.js";

import * as SharedUtils from "@recipesage/util/shared";

// Util
import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";

router.get(
  "/",
  wrapRequestWithErrorHandler(async (req, res) => {
    const originalModifiers = req.query.modifiers
      ? req.query.modifiers.split(",")
      : [];

    const mappedModifiers = {
      titleImage:
        originalModifiers.indexOf("noimage") === -1 &&
        req.query.template != "compact",
      halfsheet:
        originalModifiers.indexOf("halfsheet") !== -1 ||
        req.query.template == "compact" ||
        req.query.template == "halfsheet",
    };

    const modifierQuery = Object.keys(mappedModifiers)
      .filter((m) => mappedModifiers[m])
      .map((modifier) => `&${modifier}=true`)
      .join("");

    res.redirect(
      302,
      `/api/print/${req.query.recipeId}?printPreview=true&version=legacy${modifierQuery}`,
    );
  }),
);

router.get(
  "/:recipeId",
  MiddlewareService.validateSession(["user"], true),
  function (req, res, next) {
    if (!req.query.version)
      return res.status(400).send("Missing parameter: version");

    const modifiers = {
      version: req.query.version,
      halfsheet: !!req.query.halfsheet,
      twocolIngr: !!req.query.twocolIngr,
      verticalInstrIng: !!req.query.verticalInstrIng,
      titleImage: !!req.query.titleImage,
      hideNotes: !!req.query.hideNotes,
      hideSource: !!req.query.hideSource,
      hideSourceURL: !!req.query.hideSourceURL,
      printPreview: !!req.query.printPreview,
      showPrintButton: !!req.query.showPrintButton,
      scale: parseFloat(req.query.scale || 1, 10),
    };

    Recipe.findOne({
      where: {
        id: req.params.recipeId,
      },
      include: [
        {
          model: Label,
          as: "labels",
        },
        {
          model: Image,
          as: "images",
        },
      ],
    })
      .then(function (rObj) {
        if (!rObj) {
          res.render("error", {
            message: "404",
            error: {
              status: "Recipe not found",
              stack: "",
            },
          });
        } else {
          let recipe = rObj.toJSON();

          recipe = UtilService.sortRecipeImages(rObj);

          recipe.isOwner = res.locals.session
            ? res.locals.session.userId == recipe.userId
            : false;

          // There should be no fromUser after recipes have been moved out of the inbox
          if (recipe.folder !== "inbox" || !recipe.isOwner)
            delete recipe.fromUser;

          if (!recipe.isOwner) recipe.labels = [];

          recipe.instructions = SharedUtils.parseInstructions(
            sanitizeHtml(recipe.instructions),
            modifiers.scale,
          );
          recipe.ingredients = SharedUtils.parseIngredients(
            sanitizeHtml(recipe.ingredients),
            modifiers.scale,
            true,
          );
          recipe.notes = SharedUtils.parseNotes(sanitizeHtml(recipe.notes));

          if (!modifiers.titleImage) {
            recipe.images = [];
          }

          res.render("recipe-default", {
            recipe: recipe,
            recipeURL: `https://recipesage.com/#/recipe/${recipe.id}`,
            date: new Date().toDateString(),
            modifiers: modifiers,
          });
        }
      })
      .catch(function (err) {
        res.render("error", {
          message: "500",
          error: {
            status: "Error while loading recipe",
            stack: "",
          },
        });

        next(err);
      });
  },
);

export default router;
