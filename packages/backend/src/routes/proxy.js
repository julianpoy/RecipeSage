import * as express from "express";
const router = express.Router();
import fetch from "node-fetch";

import * as MiddlewareService from "../services/middleware.js";

router.post(
  "/ingredient-instruction-classifier",
  MiddlewareService.validateSession(["user"]),
  async (req, res, next) => {
    try {
      const response = await fetch(
        process.env.INGREDIENT_INSTRUCTION_CLASSIFIER_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(req.body),
        },
      );

      const json = await response.json();

      res.status(200).send(json);
    } catch (e) {
      next(e);
    }
  },
);

export default router;
