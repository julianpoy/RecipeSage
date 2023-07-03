import * as express from "express";
const router = express.Router();

import { clip } from "../services/clip";

router.get("/", async (req, res, next) => {
  try {
    const url = (req.query.url || "").trim();
    if (!url) {
      return res.status(400).send("Must provide a URL");
    }

    const results = await clip(url);

    res.status(200).json(results);
  } catch (e) {
    next(e);
  }
});

export default router;
