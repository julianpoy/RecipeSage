import * as express from "express";
const router = express.Router();

import { clipHtml, clipUrl } from "../services/clip";

router.get("/", async (req, res, next) => {
  try {
    const url = (req.query.url || "").trim();
    if (!url) {
      return res.status(400).send("Must provide a URL");
    }

    const results = await clipUrl(url);

    res.status(200).json(results);
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const url = (req.body.url || "").trim();
    const html = (req.body.html || "").trim();

    if (url) {
      const results = await clipUrl(url);
      return res.status(200).json(results);
    }

    if (html) {
      const results = await clipHtml(html);
      return res.status(200).json(results);
    }

    return res.status(400).send("Must provide 'html' or 'url' in body");
  } catch (e) {
    next(e);
  }
});

export default router;
