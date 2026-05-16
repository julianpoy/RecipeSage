import express from "express";
const router = express.Router();
import cors from "cors";
import moment from "moment";

// DB
import { Op } from "sequelize";
import {
  sequelize,
  User,
  Recipe,
  Label,
  Recipe_Label,
  Image,
  Recipe_Image,
} from "../models/index.js";

// Service
import * as MiddlewareService from "../services/middleware.js";
import * as Util from "@recipesage/util/shared";
import * as UtilService from "../services/util.js";
import * as Search from "@recipesage/util/server/search";
import * as SubscriptionsService from "../services/subscriptions.js";
import * as JSONLDService from "../services/json-ld.js";
import { getRecipesWithConstraints } from "../services/database/getRecipesWithConstraints";

// Util
import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";
import {
  BadRequest,
  NotFound,
  PreconditionFailed,
  InternalServerError,
} from "../utils/errors.js";
import { joiValidator } from "../middleware/joiValidator.js";
import Joi from "joi";
import { getFriendships } from "../utils/getFriendships.js";

const VALID_RATING_FILTERS = /^(\d|null)(,(\d|null))*$/;

const parseRatingFilter = (ratingFilter) => {
  return ratingFilter
    ?.split(",")
    .map((el) => (el === "null" ? null : parseInt(el, 10)));
};

const applyLegacyImageField = (recipe) => {
  if (recipe.toJSON) recipe = recipe.toJSON();

  if (recipe.images && recipe.images.length > 0) {
    const image = recipe.images[0];
    recipe.image = {
      location: image.location,
    };
  } else {
    recipe.image = null;
  }

  return recipe;
};

//Create a new recipe
router.post(
  "/",
  joiValidator(
    Joi.object({
      body: Joi.object({
        title: Joi.string().allow("").optional().allow(null), // TODO: change to required once frontend no longer needs PreconditionFailed
        description: Joi.string().allow("", null).optional(),
        yield: Joi.string().allow("", null).optional(),
        activeTime: Joi.string().allow("", null).optional(),
        totalTime: Joi.string().allow("", null).optional(),
        source: Joi.string().allow("", null).optional(),
        url: Joi.string().allow("", null).optional(),
        notes: Joi.string().allow("", null).optional(),
        ingredients: Joi.string().allow("", null).optional(),
        instructions: Joi.string().allow("", null).optional(),
        rating: Joi.number().min(1).max(5).allow(null).optional(),
        labels: Joi.array().items(Joi.string()).optional(),
        imageIds: Joi.array().items(Joi.string().uuid()).optional(),
      }),
    }),
  ),
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (!req.body.title || req.body.title.length === 0) {
      throw PreconditionFailed("Recipe title must be provided.");
    }

    const recipe = await sequelize.transaction(async (transaction) => {
      const adjustedTitle = await Recipe.findTitle(
        res.locals.session.userId,
        null,
        req.body.title,
        transaction,
      );

      const recipe = await Recipe.create(
        {
          userId: res.locals.session.userId,
          title: adjustedTitle.slice(0, 254),
          description: req.body.description || "",
          yield: req.body.yield || "",
          activeTime: req.body.activeTime || "",
          totalTime: req.body.totalTime || "",
          source: req.body.source || "",
          url: req.body.url || "",
          notes: req.body.notes || "",
          ingredients: req.body.ingredients || "",
          instructions: req.body.instructions || "",
          rating: req.body.rating || null,
          folder: "main",
        },
        {
          transaction,
        },
      );

      if (req.body.imageIds) {
        const canUploadMultipleImages =
          await SubscriptionsService.userHasCapability(
            res.locals.session.userId,
            SubscriptionsService.Capabilities.MultipleImages,
          );

        if (!canUploadMultipleImages && req.body.imageIds.length > 1) {
          const images = await Image.findAll({
            where: {
              id: {
                [Op.in]: req.body.imageIds,
              },
            },
            transaction,
          });
          const imagesById = images.reduce(
            (acc, img) => ({ ...acc, [img.id]: img }),
            {},
          );

          req.body.imageIds = req.body.imageIds.filter(
            (imageId, idx) =>
              idx === 0 || // Allow first image always (users can always upload the first image)
              imagesById[imageId].userId !== res.locals.session.userId || // Allow images uploaded by others (shared to me)
              moment(imagesById[imageId].createdAt)
                .add(1, "hour")
                .isBefore(moment()), // Allow old images (user's subscription expired)
          );
        }

        if (req.body.imageIds.length > 10) req.body.imageIds.splice(10); // Limit to 10 images per recipe max

        await Recipe_Image.bulkCreate(
          req.body.imageIds.map((imageId, idx) => ({
            imageId: imageId,
            recipeId: recipe.id,
            order: idx,
          })),
          {
            transaction,
          },
        );
      }

      if (req.body.labels?.length) {
        const sanitizedLabelTitles = req.body.labels
          .map((title) => Util.cleanLabelTitle(title || ""))
          .filter((el) => el.trim());
        const labelTitles = [...new Set(sanitizedLabelTitles)]; // Dedupe

        await Label.bulkCreate(
          labelTitles.map((title) => ({
            userId: res.locals.session.userId,
            title,
          })),
          {
            ignoreDuplicates: true,
            transaction,
          },
        );

        const labels = await Label.findAll({
          where: {
            userId: res.locals.session.userId,
            title: labelTitles,
          },
          attributes: ["id"],
          transaction,
        });

        if (labels.length !== labelTitles.length) {
          throw InternalServerError(
            "Labels length did not match labelTitles length. Orphaned labels!",
          );
        }

        await Recipe_Label.bulkCreate(
          labels.map((label) => ({
            recipeId: recipe.id,
            labelId: label.id,
          })),
          {
            ignoreDuplicates: true,
            transaction,
          },
        );
      }

      await Search.indexRecipes([recipe]);

      return recipe;
    });

    const serializedRecipe = recipe.toJSON();
    serializedRecipe.labels = [];
    res.status(201).json(serializedRecipe);
  }),
);

// Count a user's recipes
router.get(
  "/count",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const count = await Recipe.count({
      where: {
        userId: res.locals.session.userId,
        folder: req.query.folder || "main",
      },
    });

    res.status(200).json({
      count,
    });
  }),
);

router.get(
  "/search",
  joiValidator(
    Joi.object({
      query: Joi.object({
        query: Joi.string().min(1).max(1000).required(),
        userId: Joi.string().uuid().optional(),
        labels: Joi.string().optional(),
        labelIntersection: Joi.boolean().optional(),
        ratingFilter: Joi.string().regex(VALID_RATING_FILTERS).optional(),
        includeFriends: Joi.boolean().optional(),
      }),
    }),
  ),
  cors(),
  MiddlewareService.validateSession(["user"], true),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (!res.locals.session && !req.query.userId) {
      throw BadRequest("You must be logged in to request this resource");
    }

    const labels = req.query.labels?.split(",");
    const labelIntersection = req.query.labelIntersection === "true";
    const ratings = parseRatingFilter(req.query.ratingFilter);

    const userIds = [];
    if (res.locals.session?.userId && !req.query.userId)
      userIds.push(res.locals.session.userId);
    if (req.query.userId) userIds.push(req.query.userId);
    if (res.locals.session?.userId && req.query.includeFriends === "true") {
      const friendships = await getFriendships(res.locals.session.userId);

      userIds.push(...friendships.friends.map((friend) => friend.otherUser.id));
    }

    console.log(userIds);
    const recipeIds = await Search.searchRecipes(userIds, req.query.query);

    const recipeIdsMap = recipeIds.reduce((acc, recipeId, idx) => {
      acc[recipeId] = idx + 1;
      return acc;
    }, {});

    const recipes = await getRecipesWithConstraints({
      userId: res.locals.session?.userId || undefined,
      userIds,
      folder: "main", // We only allow searching main folder for now
      sortBy: ["title", "ASC"], // Doesn't really matter
      limit: 200,
      offset: 0,
      ratings,
      labels,
      labelIntersection,
      recipeIds,
    });

    recipes.data = recipes.data
      .map(UtilService.sortRecipeImages)
      .map(applyLegacyImageField)
      .sort((a, b) => {
        return recipeIdsMap[a.id] - recipeIdsMap[b.id];
      });

    res.status(200).send(recipes);
  }),
);

//Get a single recipe
router.get(
  "/:recipeId",
  cors(),
  MiddlewareService.validateSession(["user"], true),
  wrapRequestWithErrorHandler(async (req, res) => {
    let recipe = await Recipe.findOne({
      where: {
        id: req.params.recipeId,
      },
      include: [
        {
          model: User,
          as: "fromUser",
          attributes: ["name", "handle"],
        },
        {
          model: Label,
          as: "labels",
          attributes: ["id", "title", "createdAt", "updatedAt"],
        },
        {
          model: Image,
          as: "images",
          attributes: ["id", "location"],
        },
      ],
      order: [["title", "ASC"]],
    });

    if (!recipe) {
      throw NotFound("Recipe with that ID not found!");
    }

    recipe = recipe.toJSON();

    recipe = UtilService.sortRecipeImages(recipe);

    recipe = applyLegacyImageField(recipe);

    recipe.isOwner = res.locals.session
      ? res.locals.session.userId == recipe.userId
      : false;

    // There should be no fromUser after recipes have been moved out of the inbox
    if (recipe.folder !== "inbox" || !recipe.isOwner) delete recipe.fromUser;

    if (!recipe.isOwner) recipe.labels = [];

    res.status(200).json(recipe);
  }),
);

router.get(
  "/:recipeId/json-ld",
  cors(),
  MiddlewareService.validateSession(["user"], true),
  wrapRequestWithErrorHandler(async (req, res) => {
    let recipe = await Recipe.findOne({
      where: {
        id: req.params.recipeId,
      },
      include: [
        {
          model: Image,
          as: "images",
          attributes: ["id", "location"],
        },
      ],
      order: [["title", "ASC"]],
    });

    if (!recipe) {
      throw NotFound("Recipe with that ID not found!");
    }

    recipe = recipe.toJSON();

    recipe = UtilService.sortRecipeImages(recipe);

    const jsonLD = JSONLDService.recipeToJSONLD(recipe);

    res.status(200).json(jsonLD);
  }),
);

const deleteRecipes = async (userId, { recipeIds, labelIds }, transaction) => {
  if (!recipeIds && !labelIds) {
    throw new Error("Must pass recipeIds or labelIds");
  }

  if (recipeIds && labelIds) {
    throw new Error("Must pass only recipeIds or labelIds");
  }

  if (!recipeIds) {
    const recipeLabels = await Recipe_Label.findAll({
      where: {
        labelId: {
          [Op.in]: labelIds,
        },
      },
      transaction,
    });

    recipeIds = [
      ...new Set(recipeLabels.map((recipeLabel) => recipeLabel.recipeId)),
    ];
  }

  const recipes = await Recipe.findAll({
    where: {
      id: { [Op.in]: recipeIds },
      userId,
    },
    attributes: ["id"],
    include: [
      {
        model: Label,
        as: "labels",
        attributes: ["id"],
        include: [
          {
            model: Recipe,
            as: "recipes",
            attributes: ["id"],
          },
        ],
      },
    ],
    transaction,
  });

  if (recipes.length === 0) throw NotFound("No recipes found.");

  const nonDeletionRecipesByLabelId = {};
  recipes
    .reduce((acc, recipe) => acc.concat(recipe.labels), [])
    .map((label) => {
      label.recipes.map((labelRecipe) => {
        nonDeletionRecipesByLabelId[label.id] =
          nonDeletionRecipesByLabelId[label.id] || [];
        if (recipeIds.indexOf(labelRecipe.id) === -1)
          nonDeletionRecipesByLabelId[label.id].push(labelRecipe);
      });
    });

  // Any label with zero existing recipes after deletion
  const labelIdsToRemove = Object.entries(nonDeletionRecipesByLabelId)
    .filter(([, labelRecipes]) => labelRecipes.length === 0)
    .map(([id]) => id);

  await Recipe.destroy({
    where: {
      id: { [Op.in]: recipeIds },
      userId,
    },
    transaction,
  });

  await Label.destroy({
    where: {
      id: { [Op.in]: labelIdsToRemove },
      userId,
    },
    transaction,
  });

  await Search.deleteRecipes(recipeIds);
};

router.delete(
  "/:id",
  joiValidator(
    Joi.object({
      params: Joi.object({
        id: Joi.string().uuid().required(),
      }),
    }),
  ),
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    await sequelize.transaction(async (transaction) => {
      await deleteRecipes(
        res.locals.session.userId,
        {
          recipeIds: [req.params.id],
        },
        transaction,
      );
    });

    res.sendStatus(200);
  }),
);

export default router;
