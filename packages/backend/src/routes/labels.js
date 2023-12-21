import * as express from "express";
const router = express.Router();
import * as cors from "cors";
import * as Joi from "joi";

// DB
import { Op } from "sequelize";
import { sequelize, Recipe, Label, Recipe_Label } from "../models/index.js";

// Services
import * as MiddlewareService from "../services/middleware.js";
import * as Util from "@recipesage/util";
import { joiValidator } from "../middleware/joiValidator.js";

// Util
import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";
import {
  BadRequest,
  NotFound,
  Conflict,
  PreconditionFailed,
} from "../utils/errors.js";

//Add a label to a recipeId or recipeIds
router.post(
  "/",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const title = Util.cleanLabelTitle(req.body.title || "");

    if (!title || title.length === 0) {
      throw PreconditionFailed("Label title must be provided.");
    }

    if (
      (!req.body.recipeId || req.body.recipeId.length === 0) &&
      (!req.body.recipeIds || req.body.recipeIds.length === 0)
    ) {
      throw PreconditionFailed("RecipeId or recipeIds must be provided.");
    }

    const recipeIds = req.body.recipeId
      ? [req.body.recipeId]
      : req.body.recipeIds;

    const label = await sequelize.transaction(async (transaction) => {
      const [label] = await Label.findOrCreate({
        where: {
          userId: res.locals.session.userId,
          title,
        },
        transaction,
      });

      await Recipe_Label.bulkCreate(
        recipeIds.map((recipeId) => ({
          recipeId,
          labelId: label.id,
        })),
        {
          ignoreDuplicates: true,
          transaction,
        },
      );

      return label;
    });

    res.status(201).send(label);
  }),
);

//Get all of a user's labels
router.get(
  "/",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const addlOptions = {};
    if (req.query.title) {
      addlOptions.title = req.query.title;
    }

    const labels = await Label.findAll({
      where: {
        userId: res.locals.session.userId,
        ...addlOptions,
      },
      include: [
        {
          model: Recipe_Label,
          as: "recipe_labels",
          attributes: [],
        },
      ],
      attributes: [
        "id",
        "title",
        "createdAt",
        "updatedAt",
        [
          sequelize.fn("COUNT", sequelize.col("recipe_labels.id")),
          "recipeCount",
        ],
      ],
      group: ["Label.id"],
      order: [["title", "ASC"]],
    });

    res.status(200).json(labels);
  }),
);

//Get recipes associated with specific label
router.get(
  "/:labelId",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const label = await Label.findOne({
      where: {
        id: req.query.labelId,
        userId: res.locals.session.userId,
      },
      include: [
        {
          model: Recipe_Label,
          as: "recipe_labels",
          attributes: [],
        },
      ],
      attributes: [
        "id",
        "title",
        "createdAt",
        "updatedAt",
        [
          sequelize.fn("COUNT", sequelize.col("recipe_labels.id")),
          "recipeCount",
        ],
      ],
      group: ["Label.id"],
    });

    res.status(200).json(label);
  }),
);

//Combine two labels
router.post(
  "/merge",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (!req.query.sourceLabelId || !req.query.targetLabelId) {
      throw BadRequest("Must pass sourceLabelId and targetLabelId");
    }

    if (req.query.sourceLabelId === req.query.targetLabelId) {
      throw BadRequest("Source label id cannot match destination label id");
    }

    await sequelize.transaction(async (transaction) => {
      const sourceLabel = await Label.findOne({
        where: {
          id: req.query.sourceLabelId,
          userId: res.locals.session.userId,
        },
        include: [
          {
            model: Recipe_Label,
            as: "recipe_labels",
            attributes: ["recipeId"],
          },
        ],
        transaction,
      });

      if (!sourceLabel) {
        throw NotFound("Source label not found");
      }

      const targetLabel = await Label.findOne({
        where: {
          id: req.query.targetLabelId,
          userId: res.locals.session.userId,
        },
        include: [
          {
            model: Recipe_Label,
            as: "recipe_labels",
            attributes: ["recipeId"],
          },
        ],
        transaction,
      });

      if (!targetLabel) {
        throw NotFound("Target label not found");
      }

      const sourceLabelRecipeIds = sourceLabel.recipe_labels.map(
        (recipeLabel) => recipeLabel.recipeId,
      );
      const targetLabelRecipeIds = targetLabel.recipe_labels.map(
        (recipeLabel) => recipeLabel.recipeId,
      );

      const recipeIdsToUpdate = sourceLabelRecipeIds.filter(
        (recipeId) => !targetLabelRecipeIds.includes(recipeId),
      );

      await Recipe_Label.update(
        {
          labelId: req.query.targetLabelId,
        },
        {
          where: {
            labelId: req.query.sourceLabelId,
            recipeId: recipeIdsToUpdate,
          },
          transaction,
        },
      );

      await Label.destroy({
        where: {
          id: req.query.sourceLabelId,
        },
        transaction,
      });
    });

    res.status(200).send("ok");
  }),
);

//Delete a label from a recipe
router.delete(
  "/",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (!req.query.recipeId || !req.query.labelId) {
      throw PreconditionFailed("RecipeId and LabelId are required!");
    }

    await sequelize
      .transaction(async (transaction) => {
        const label = await Label.findOne({
          where: {
            id: req.query.labelId,
            userId: res.locals.session.userId,
          },
          include: [
            {
              model: Recipe,
              as: "recipes",
              attributes: ["id"],
            },
          ],
          transaction,
        });

        if (!label || !label.recipes.some((r) => r.id == req.query.recipeId)) {
          throw NotFound("Label does not exist!");
        }

        await label.removeRecipe(req.query.recipeId, {
          transaction,
        });

        return label;
      })
      .then((label) => {
        res.status(200).json(label);
      });
  }),
);

// Update label for all associated recipes
router.put(
  "/:id",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (
      typeof req.body.title === "string" &&
      Util.cleanLabelTitle(req.body.title).length === 0
    ) {
      throw BadRequest("Label title must be longer than 0.");
    }

    const label = await sequelize.transaction(async (transaction) => {
      const label = await Label.findOne({
        where: {
          id: req.params.id,
          userId: res.locals.session.userId,
        },
        transaction,
      });

      if (!label) {
        throw NotFound("Label with that ID does not exist!");
      }

      if (typeof req.body.title === "string")
        label.title = Util.cleanLabelTitle(req.body.title);

      const labels = await Label.findAll({
        where: {
          id: { [Op.ne]: label.id },
          title: req.body.title,
          userId: res.locals.session.userId,
        },
        transaction,
      });

      if (labels && labels.length > 0) {
        throw Conflict("Label with that title already exists!");
      }

      return await label.save({ transaction });
    });

    res.status(200).json(label);
  }),
);

// Delete labels from all associated recipes
router.post(
  "/delete-bulk",
  joiValidator(
    Joi.object({
      body: Joi.object({
        labelIds: Joi.array().items(Joi.string()).min(1).required(),
      }),
    }),
  ),
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    await Label.destroy({
      where: {
        id: { [Op.in]: req.body.labelIds },
        userId: res.locals.session.userId,
      },
    });

    res.sendStatus(200);
  }),
);

export default router;
