import * as express from "express";
const router = express.Router();
import * as cors from "cors";
import * as xmljs from "xml-js";
import * as moment from "moment";

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
import * as UtilService from "../services/util.js";
import * as SearchService from "@recipesage/trpc";
import * as SubscriptionsService from "../services/subscriptions.js";
import * as JSONLDService from "../services/json-ld.js";
import { getRecipesWithConstraints } from "../services/database/getRecipesWithConstraints";

// Util
import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";
import {
  BadRequest,
  Unauthorized,
  NotFound,
  PreconditionFailed,
  InternalServerError,
} from "../utils/errors.js";
import { joiValidator } from "../middleware/joiValidator.js";
import * as Joi from "joi";
import { deleteHangingImagesForUser } from "../utils/data/deleteHangingImages.js";
import { getFriendships } from "../utils/getFriendships.js";

const VALID_RECIPE_FOLDERS = ["main", "inbox"];
const VALID_RATING_FILTERS = /^(\d|null)(,(\d|null))*$/;
const VALID_RECIPE_SORT = [
  "-title",
  "createdAt",
  "-createdAt",
  "updatedAt",
  "-updatedAt",
];

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
        title: Joi.string().allow("").optional(), // TODO: change to required once frontend no longer needs PreconditionFailed
        description: Joi.string().allow("").optional(),
        yield: Joi.string().allow("").optional(),
        activeTime: Joi.string().allow("").optional(),
        totalTime: Joi.string().allow("").optional(),
        source: Joi.string().allow("").optional(),
        url: Joi.string().allow("").optional(),
        notes: Joi.string().allow("").optional(),
        ingredients: Joi.string().allow("").optional(),
        instructions: Joi.string().allow("").optional(),
        rating: Joi.number().min(1).max(5).allow(null).optional(),
        labels: Joi.array().items(Joi.string()).optional(),
        imageIds: Joi.array().items(Joi.string().uuid()).optional(),
      }),
    })
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
        transaction
      );

      const recipe = await Recipe.create(
        {
          userId: res.locals.session.userId,
          title: adjustedTitle,
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
        }
      );

      if (req.body.imageIds) {
        const canUploadMultipleImages =
          await SubscriptionsService.userHasCapability(
            res.locals.session.userId,
            SubscriptionsService.CAPABILITIES.MULTIPLE_IMAGES
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
            {}
          );

          req.body.imageIds = req.body.imageIds.filter(
            (imageId, idx) =>
              idx === 0 || // Allow first image always (users can always upload the first image)
              imagesById[imageId].userId !== res.locals.session.userId || // Allow images uploaded by others (shared to me)
              moment(imagesById[imageId].createdAt)
                .add(1, "hour")
                .isBefore(moment()) // Allow old images (user's subscription expired)
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
          }
        );
      }

      if (req.body.labels?.length) {
        const sanitizedLabelTitles = req.body.labels
          .map((title) => UtilService.cleanLabelTitle(title || ""))
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
          }
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
            "Labels length did not match labelTitles length. Orphaned labels!"
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
          }
        );
      }

      await SearchService.indexRecipes([recipe]);

      return recipe;
    });

    const serializedRecipe = recipe.toJSON();
    serializedRecipe.labels = [];
    res.status(201).json(serializedRecipe);
  })
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
  })
);

//Get all of a user's recipes (paginated)
router.get(
  "/by-page",
  joiValidator(
    Joi.object({
      query: Joi.object({
        sort: Joi.string()
          .valid(...VALID_RECIPE_SORT)
          .optional(),
        userId: Joi.string().uuid().optional(),
        includeFriends: Joi.boolean().optional(),
        folder: Joi.string()
          .valid(...VALID_RECIPE_FOLDERS)
          .optional(),
        labels: Joi.string().optional(),
        labelIntersection: Joi.boolean().optional(),
        ratingFilter: Joi.string().regex(VALID_RATING_FILTERS).optional(),
        count: Joi.number().optional(),
        offset: Joi.number().optional(),
      }),
    })
  ),
  cors(),
  MiddlewareService.validateSession(["user"], true),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (!res.locals.session && !req.query.userId) {
      throw Unauthorized("You must be logged in to request this resource");
    }

    const offset = req.query.offset || 0;
    const limit = Math.min(parseInt(req.query.count) || 100, 500);
    const folder = req.query.folder || "main";

    let sortBy = ["title", "ASC"];
    if (req.query.sort) {
      switch (req.query.sort) {
        case "-title": // TODO: This seems to be backwards...
          sortBy = ["title", "ASC"];
          break;
        case "createdAt":
          sortBy = ["createdAt", "ASC"];
          break;
        case "-createdAt":
          sortBy = ["createdAt", "DESC"];
          break;
        case "updatedAt":
          sortBy = ["updatedAt", "ASC"];
          break;
        case "-updatedAt":
          sortBy = ["updatedAt", "DESC"];
          break;
      }
    }

    const ratings = parseRatingFilter(req.query.ratingFilter);

    const labels = req.query.labels?.split(",");
    const labelIntersection = req.query.labelIntersection === "true";

    const userIds = [];
    if (res.locals.session?.userId && !req.query.userId)
      userIds.push(res.locals.session.userId);
    if (req.query.userId) userIds.push(req.query.userId);
    if (res.locals.session?.userId && req.query.includeFriends === "true") {
      const friendships = await getFriendships(res.locals.session.userId);

      userIds.push(...friendships.friends.map((friend) => friend.otherUser.id));
    }

    const recipes = await getRecipesWithConstraints({
      userId: res.locals.session.userId,
      userIds,
      folder,
      sortBy,
      limit,
      offset,
      ratings,
      labels,
      labelIntersection,
    });

    recipes.data = recipes.data
      .map(UtilService.sortRecipeImages)
      .map(applyLegacyImageField);

    res.status(200).send(recipes);
  })
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
    })
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
    const recipeIds = await SearchService.searchRecipes(
      userIds,
      req.query.query
    );

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
  })
);

router.get(
  "/export",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const recipes = await Recipe.findAll({
      where: {
        userId: res.locals.session.userId,
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
        "rating",
        "folder",
        "createdAt",
        "updatedAt",
        "userId",
      ],
      include: [
        {
          model: User,
          as: "fromUser",
          attributes: ["name", "email"],
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

    const recipes_j = recipes.map((e) => e.toJSON());

    let data;
    let mimetype;

    switch (req.query.format) {
      case "json":
        data = JSON.stringify(recipes_j);
        mimetype = "application/json";
        break;
      case "xml":
        data = xmljs.json2xml(recipes_j, {
          compact: true,
          ignoreComment: true,
          spaces: 4,
        });
        mimetype = "text/xml";
        break;
      case "txt":
        data = "";

        for (let i = 0; i < recipes_j.length; i++) {
          const recipe = recipes_j[i];

          recipe.labels = recipe.labels.map((label) => label.title).join(", ");

          recipe.images = recipe.images
            .map((image) => image.location)
            .join(", ");

          delete recipe.fromUser;

          for (const key in recipe) {
            data += key + ": ";
            data += recipe[key] + "\r\n";
          }
          data += "\r\n";
        }

        res.charset = "UTF-8";
        mimetype = "text/plain";
        break;
      default:
        throw BadRequest(
          "Unknown export format. Please send json, xml, or txt."
        );
    }

    res.setHeader(
      "Content-disposition",
      "attachment; filename=recipes-" + Date.now() + "." + req.query.format
    );
    res.setHeader("Content-type", mimetype);
    res.write(data);
    res.end();
  })
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
          attributes: ["name", "email"],
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
  })
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
  })
);

//Update a recipe
router.put(
  "/:id",
  joiValidator(
    Joi.object({
      body: Joi.object({
        title: Joi.string().optional(),
        description: Joi.string().allow("").optional(),
        yield: Joi.string().allow("").optional(),
        activeTime: Joi.string().allow("").optional(),
        totalTime: Joi.string().allow("").optional(),
        source: Joi.string().allow("").optional(),
        url: Joi.string().allow("").optional(),
        notes: Joi.string().allow("").optional(),
        ingredients: Joi.string().allow("").optional(),
        instructions: Joi.string().allow("").optional(),
        rating: Joi.number().min(1).max(5).allow(null).optional(),
        folder: Joi.string()
          .valid(...VALID_RECIPE_FOLDERS)
          .optional(),
        imageIds: Joi.array().items(Joi.string().uuid()).optional(),
      }),
    })
  ),
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const updatedRecipe = await sequelize.transaction(async (transaction) => {
      const recipe = await Recipe.findOne({
        where: {
          id: req.params.id,
          userId: res.locals.session.userId,
        },
        transaction,
      });

      if (!recipe) {
        throw NotFound("Recipe with that ID does not exist!");
      }

      if (typeof req.body.description === "string")
        recipe.description = req.body.description;
      if (typeof req.body.yield === "string") recipe.yield = req.body.yield;
      if (typeof req.body.activeTime === "string")
        recipe.activeTime = req.body.activeTime;
      if (typeof req.body.totalTime === "string")
        recipe.totalTime = req.body.totalTime;
      if (typeof req.body.source === "string") recipe.source = req.body.source;
      if (typeof req.body.url === "string") recipe.url = req.body.url;
      if (typeof req.body.notes === "string") recipe.notes = req.body.notes;
      if (typeof req.body.ingredients === "string")
        recipe.ingredients = req.body.ingredients;
      if (typeof req.body.instructions === "string")
        recipe.instructions = req.body.instructions;
      if (typeof req.body.rating === "number" || req.body.rating === null)
        recipe.rating = req.body.rating;
      if (typeof req.body.folder === "string") recipe.folder = req.body.folder;

      const adjustedTitle = await Recipe.findTitle(
        res.locals.session.userId,
        recipe.id,
        req.body.title || recipe.title,
        transaction
      );

      recipe.title = adjustedTitle;

      const updatedRecipe = await recipe.save({
        transaction,
      });

      if (req.body.imageIds) {
        const canUploadMultipleImages =
          await SubscriptionsService.userHasCapability(
            res.locals.session.userId,
            SubscriptionsService.CAPABILITIES.MULTIPLE_IMAGES
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
            {}
          );

          req.body.imageIds = req.body.imageIds.filter(
            (imageId, idx) =>
              idx === 0 || // Allow first image always (users can always upload the first image)
              imagesById[imageId].userId !== res.locals.session.userId || // Allow images uploaded by others (shared to me)
              moment(imagesById[imageId].createdAt)
                .add(1, "day")
                .isBefore(moment()) // Allow old images (user's subscription expired)
          );
        }

        if (req.body.imageIds.length > 10) req.body.imageIds.splice(10); // Limit to 10 images per recipe max

        await Recipe_Image.destroy({
          where: {
            recipeId: recipe.id,
          },
          transaction,
        });

        await Recipe_Image.bulkCreate(
          req.body.imageIds.map((imageId, idx) => ({
            recipeId: recipe.id,
            imageId: imageId,
            order: idx,
          })),
          {
            transaction,
          }
        );
      }

      await SearchService.indexRecipes([updatedRecipe]);

      return updatedRecipe;
    });

    res.status(200).json(updatedRecipe);
  })
);

router.delete(
  "/all",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const { userId } = res.locals.session;

    await sequelize.transaction(async (transaction) => {
      const recipes = await Recipe.findAll({
        where: {
          userId,
        },
        attributes: ["id"],
        transaction,
      });
      const recipeIds = recipes.map((recipe) => recipe.id);

      await Recipe.destroy({
        where: {
          userId,
        },
        transaction,
      });

      await Label.destroy({
        where: {
          userId,
        },
        transaction,
      });

      // TODO: Remove this when we have a way of mocking
      if (process.env.NODE_ENV !== "test") {
        await SearchService.deleteRecipes(recipeIds);

        await deleteHangingImagesForUser(userId, transaction);
      }
    });

    res.status(200).send({});
  })
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

  await SearchService.deleteRecipes(recipeIds);
};

router.post(
  "/delete-by-labelIds",
  joiValidator(
    Joi.object({
      body: Joi.object({
        labelIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
      }),
    })
  ),
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    await sequelize.transaction(async (transaction) => {
      await deleteRecipes(
        res.locals.session.userId,
        {
          labelIds: req.body.labelIds,
        },
        transaction
      );
    });

    res.sendStatus(200);
  })
);

router.post(
  "/delete-bulk",
  joiValidator(
    Joi.object({
      body: Joi.object({
        recipeIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
      }),
    })
  ),
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    await sequelize.transaction(async (transaction) => {
      await deleteRecipes(
        res.locals.session.userId,
        {
          recipeIds: req.body.recipeIds,
        },
        transaction
      );
    });

    res.sendStatus(200);
  })
);

router.delete(
  "/:id",
  joiValidator(
    Joi.object({
      params: Joi.object({
        id: Joi.string().uuid().required(),
      }),
    })
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
        transaction
      );
    });

    res.sendStatus(200);
  })
);

export default router;
