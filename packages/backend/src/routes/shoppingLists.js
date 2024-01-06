import * as express from "express";
const router = express.Router();
import * as cors from "cors";
import * as Joi from "joi";

// DB
import { Op } from "sequelize";
import {
  sequelize,
  User,
  Recipe,
  MealPlanItem,
  ShoppingList,
  ShoppingListItem,
} from "../models/index.js";

// Service
import * as MiddlewareService from "../services/middleware.js";
import * as GripService from "../services/grip.js";
import * as ShoppingListCategorizerService from "../services/shopping-list-categorizer.js";
import { joiValidator } from "../middleware/joiValidator.js";

// Util
import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";
import { NotFound, PreconditionFailed } from "../utils/errors.js";

router.post(
  "/",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    if (!req.body.title || req.body.title.length === 0) {
      throw PreconditionFailed("Shopping list title must be provided.");
    }
    const shoppingList = await sequelize.transaction(async (transaction) => {
      const shoppingList = await ShoppingList.create(
        {
          title: req.body.title,
          userId: res.locals.session.userId,
        },
        {
          transaction,
        },
      );

      if (req.body.collaborators?.length) {
        await shoppingList.addCollaborators(req.body.collaborators, {
          transaction,
        });
      }

      return shoppingList;
    });

    for (let i = 0; i < (req.body.collaborators || []).length; i++) {
      GripService.broadcast(
        req.body.collaborators[i],
        "shoppingList:received",
        {
          shoppingListId: shoppingList.id,
          from: {
            id: res.locals.user.id,
            name: res.locals.user.name,
            email: res.locals.user.email,
          },
        },
      );
    }

    res.status(200).json(shoppingList);
  }),
);

router.get(
  "/",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const shoppingListIds = (
      await ShoppingList.findAll({
        where: {
          [Op.or]: [
            { userId: res.locals.session.userId },
            { "$collaborators.id$": res.locals.session.userId },
          ],
        },
        include: [
          {
            model: User,
            as: "collaborators",
            attributes: ["id"],
          },
        ],
        attributes: ["id"],
      })
    ).map((result) => result.id);

    const shoppingLists = await ShoppingList.findAll({
      where: {
        id: shoppingListIds,
      },
      include: [
        {
          model: User,
          as: "collaborators",
          attributes: ["id", "name", "email"],
        },
        {
          model: User,
          as: "owner",
          attributes: ["id", "name", "email"],
        },
        {
          model: ShoppingListItem,
          as: "items",
          attributes: [],
        },
      ],
      attributes: [
        "id",
        "title",
        "createdAt",
        "updatedAt",
        [sequelize.fn("COUNT", sequelize.col("items.id")), "itemCount"],
      ],
      group: [
        "ShoppingList.id",
        "collaborators.id",
        "collaborators->ShoppingList_Collaborator.id",
        "owner.id",
      ],
      order: [["updatedAt", "DESC"]],
    });

    const serializedShoppingLists = shoppingLists.map((list) => {
      const l = list.dataValues;
      l.myUserId = res.locals.session.userId;

      return l;
    });

    res.status(200).json(serializedShoppingLists);
  }),
);

// Add items to a shopping list
router.post(
  "/:shoppingListId",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    const shoppingList = await ShoppingList.findOne({
      where: {
        id: req.params.shoppingListId,
        [Op.or]: [
          { userId: res.locals.session.userId },
          { "$collaborators.id$": res.locals.session.userId },
        ],
      },
      include: [
        {
          model: User,
          as: "collaborators",
          attributes: ["id"],
        },
      ],
    });

    if (!shoppingList) {
      throw NotFound(
        "Shopping list with that ID not found or you do not have access!",
      );
    }

    await ShoppingListItem.bulkCreate(
      req.body.items.map((item) => ({
        title: item.title,
        completed: item.completed || false,
        userId: res.locals.session.userId,
        shoppingListId: shoppingList.id,
        recipeId: item.recipeId || null,
        mealPlanItemId: item.mealPlanItemId || null,
      })),
    );

    let reference = Date.now();

    const broadcastPayload = {
      shoppingListId: shoppingList.id,
      updatedBy: {
        id: res.locals.user.id,
        name: res.locals.user.name,
        email: res.locals.user.email,
      },
      reference,
    };

    GripService.broadcast(
      shoppingList.userId,
      "shoppingList:itemsUpdated",
      broadcastPayload,
    );
    for (let i = 0; i < shoppingList.collaborators.length; i++) {
      GripService.broadcast(
        shoppingList.collaborators[i].id,
        "shoppingList:itemsUpdated",
        broadcastPayload,
      );
    }

    res.status(200).json({
      reference,
    });
  }),
);

// Delete shopping list from account
router.delete(
  "/:shoppingListId",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    const shoppingList = await ShoppingList.findOne({
      where: {
        id: req.params.shoppingListId,
        [Op.or]: [
          { userId: res.locals.session.userId },
          { "$collaborators.id$": res.locals.session.userId },
        ],
      },
      include: [
        {
          model: User,
          as: "collaborators",
          attributes: ["id"],
        },
      ],
    });

    if (!shoppingList) {
      throw NotFound("Shopping list not found or not visible to you!");
    }

    if (shoppingList.userId === res.locals.session.userId) {
      await shoppingList.destroy();

      for (let i = 0; i < (shoppingList.collaborators || []).length; i++) {
        GripService.broadcast(
          shoppingList.collaborators[i],
          "shoppingList:removed",
          {
            shoppingListId: shoppingList.id,
            updatedBy: {
              id: res.locals.user.id,
              name: res.locals.user.name,
              email: res.locals.user.email,
            },
          },
        );
      }
    } else {
      await shoppingList.removeCollaborator(res.locals.session.userId);
    }

    res.status(200).json({});
  }),
);

// Delete items from a shopping list by a list of item ids
router.delete(
  "/:shoppingListId/items",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    // items for legacy, itemIds as replacement
    const itemIds = (req.query.items || req.query.itemIds).split(",");

    const shoppingList = await ShoppingList.findOne({
      where: {
        id: req.params.shoppingListId,
        [Op.or]: [
          { userId: res.locals.session.userId },
          { "$collaborators.id$": res.locals.session.userId },
        ],
      },
      include: [
        {
          model: User,
          as: "collaborators",
          attributes: ["id"],
        },
      ],
    });

    if (!shoppingList) {
      throw NotFound("Shoppinglist does not exist or you do not have access");
    }

    await ShoppingListItem.destroy({
      where: {
        id: {
          [Op.in]: itemIds,
        },
      },
    });

    let reference = Date.now();

    const deletedItemBroadcast = {
      shoppingListId: shoppingList.id,
      updatedBy: {
        id: res.locals.user.id,
        name: res.locals.user.name,
        email: res.locals.user.email,
      },
      reference,
    };

    GripService.broadcast(
      shoppingList.userId,
      "shoppingList:itemsUpdated",
      deletedItemBroadcast,
    );
    for (let i = 0; i < shoppingList.collaborators.length; i++) {
      GripService.broadcast(
        shoppingList.collaborators[i].id,
        "shoppingList:itemsUpdated",
        deletedItemBroadcast,
      );
    }

    res.status(200).json({
      reference,
    });
  }),
);

//Get a single shopping list
router.get(
  "/:shoppingListId",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const shoppingList = await ShoppingList.findOne({
      where: {
        id: req.params.shoppingListId,
        [Op.or]: [
          { userId: res.locals.session.userId },
          { "$collaborators.id$": res.locals.session.userId },
        ],
      },
      include: [
        {
          model: User,
          as: "collaborators",
          attributes: ["id"],
        },
      ],
    });

    if (!shoppingList) {
      throw NotFound("Recipe with that ID not found!");
    }

    const shoppingListSummary = await ShoppingList.findOne({
      where: {
        id: shoppingList.id,
      },
      include: [
        {
          model: User,
          as: "collaborators",
          attributes: ["id", "name", "email"],
        },
        {
          model: User,
          as: "owner",
          attributes: ["id", "name", "email"],
        },
        {
          model: ShoppingListItem,
          as: "items",
          attributes: ["id", "title", "completed", "createdAt", "updatedAt"],
          include: [
            {
              model: User,
              as: "owner",
              attributes: ["id", "name", "email"],
            },
            {
              model: MealPlanItem,
              as: "mealPlanItem",
              attributes: ["id", "title"],
            },
            {
              model: Recipe,
              as: "recipe",
              attributes: ["id", "title"],
            },
          ],
        },
      ],
    });

    let s = shoppingListSummary.toJSON();
    ShoppingListCategorizerService.groupShoppingListItems(s.items);
    s.items.forEach(
      (item) =>
        (item.categoryTitle = ShoppingListCategorizerService.getCategoryTitle(
          item.title,
        )),
    );

    res.status(200).json(s);
  }),
);

// Update a shopping list meta info (NOT INCLUDING ITEMS)
// router.put(
//   '/:shoppingListId',
//   cors(),
//   MiddlewareService.validateSession(['user']),
//   function(req, res, next) {

//   let updates = {};

//   if (typeof req.body.title === 'string') updates.title = req.body.title;
//   if (req.body.collaborators) updates.collaborators = req.body.collaborators;

//   ShoppingList.update(updates, {
//     id: req.params.shoppingListId,
//     userId: res.locals.session.userId
//   }, function(shoppingList) {
//     if (!shoppingList) {
//       res.status(404).json({
//         msg: "Shopping list with that ID does not exist or you do not have access!"
//       });
//     } else {
//       res.status(200).json({});
//     }
//   }).catch(next);
// });

// Update items from a shopping list by a list of item ids
router.put(
  "/:shoppingListId/items",
  joiValidator(
    Joi.object({
      params: Joi.object({
        shoppingListId: Joi.string().required().uuid(),
      }),
      query: Joi.object({
        itemIds: Joi.string().required(),
      }),
      body: Joi.object({
        title: Joi.string().min(1),
        completed: Joi.boolean(),
      }),
    }),
  ),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    const shoppingList = await ShoppingList.findOne({
      where: {
        id: req.params.shoppingListId,
        [Op.or]: [
          { userId: res.locals.session.userId },
          { "$collaborators.id$": res.locals.session.userId },
        ],
      },
      include: [
        {
          model: User,
          as: "collaborators",
          attributes: ["id"],
        },
      ],
    });

    if (!shoppingList) {
      throw NotFound("Shoppinglist does not exist or you do not have access");
    }

    await ShoppingListItem.update(
      {
        ...req.body,
      },
      {
        where: {
          id: {
            [Op.in]: req.query.itemIds.split(","),
          },
        },
      },
    );

    const reference = Date.now();

    const broadcast = {
      shoppingListId: shoppingList.id,
      updatedBy: {
        id: res.locals.user.id,
        name: res.locals.user.name,
        email: res.locals.user.email,
      },
      reference,
    };

    GripService.broadcast(
      shoppingList.userId,
      "shoppingList:itemsUpdated",
      broadcast,
    );
    for (let i = 0; i < shoppingList.collaborators.length; i++) {
      GripService.broadcast(
        shoppingList.collaborators[i].id,
        "shoppingList:itemsUpdated",
        broadcast,
      );
    }

    res.status(200).json({
      reference,
    });
  }),
);

export default router;
