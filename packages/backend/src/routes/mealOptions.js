import express from "express";
const router = express.Router();
import cors from "cors";

// import { sequelize, Recipe, Label, Recipe_Label } from "../models/index.js";
import { sequelize, MealOption } from "../models/index.js";

// Services
import * as MiddlewareService from "../services/middleware.js";
import * as Util from "@recipesage/util/shared";

// Util
import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";
import { BadRequest, NotFound, PreconditionFailed } from "../utils/errors.js";

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

    const mealOptions = await MealOption.findAll({
      where: {
        userId: res.locals.session.userId,
        ...addlOptions,
      },
      attributes: ["id", "title", "mealTime"],
      order: [["title", "ASC"]],
    });

    res.status(200).json(mealOptions);
  }),
);

//Get recipes associated with specific label
router.get(
  "/:mealOptionId",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const mealOption = await MealOption.findOne({
      where: {
        id: req.query.mealOptionId,
        userId: res.locals.session.userId,
      },
      attributes: ["id", "title", "mealTime"],
      group: ["MealOption.id"],
    });

    res.status(200).json(mealOption);
  }),
);

//Delete a meal option
router.delete(
  "/",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (!req.query.mealOptionId) {
      throw PreconditionFailed("MealOptionId is required!");
    }

    await sequelize
      .transaction(async (transaction) => {
        const mealOption = await MealOption.findOne({
          where: {
            id: req.query.mealOptionId,
            userId: res.locals.session.userId,
          },
          order: [["title", "ASC"]],
          transaction,
        });

        if (!mealOption) {
          throw NotFound("MealOption does not exist!");
        }

        await mealOption.destroy({
          transaction,
        });

        return mealOption;
      })
      .then((mealOption) => {
        res.status(200).json(mealOption);
      });
  }),
);

// Update meal option
router.put(
  "/:mealOptionId",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (
      typeof req.body.title === "string" &&
      Util.cleanLabelTitle(req.body.title).length === 0
    ) {
      throw BadRequest("Label title must be longer than 0.");
    }

    const mealOption = await sequelize.transaction(async (transaction) => {
      const mealOption = await MealOption.findOne({
        where: {
          id: req.params.mealOptionId,
          userId: res.locals.session.userId,
        },
        transaction,
      });

      if (!mealOption) {
        throw NotFound("MealOption with that ID does not exist!");
      }

      if (typeof req.body.title === "string")
        mealOption.title = Util.cleanLabelTitle(req.body.title);

      mealOption.mealTime = req.body.mealTime;

      await mealOption.save({ transaction });

      return mealOption;
    });

    res.status(200).json(mealOption);
  }),
);

export default router;
