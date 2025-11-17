import express from "express";
const router = express.Router();
import fetch from "node-fetch";

router.post("/ingredient-instruction-classifier", async (req, res, next) => {
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

    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      res.status(response.status).json(json);
    } catch {
      res.status(response.status).send(text);
    }
  } catch (e) {
    next(e);
  }
});

router.post("/grocery-categorizer", async (req, res, next) => {
  try {
    const response = await fetch(process.env.GROCERY_CATEGORIZER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      res.status(response.status).json(json);
    } catch {
      res.status(response.status).send(text);
    }
  } catch (e) {
    next(e);
  }
});

export default router;
