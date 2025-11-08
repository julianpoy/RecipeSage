import express from "express";
const router = express.Router();

import {
  ClipFetchError,
  clipHtml,
  ClipTimeoutError,
  clipUrl,
} from "@recipesage/util/server/general";

router.get("/", async (req, res, next) => {
  try {
    const url = (req.query.url || "").trim();
    if (!url) {
      return res.status(400).send("Must provide a URL");
    }

    try {
      const results = await clipUrl(url);
      // Compatibility with old clients
      res.status(200).json({
        ...results.recipe,
        imageURL: results.images[0] || "",
      });
    } catch (e) {
      if (e instanceof ClipTimeoutError || e instanceof ClipFetchError) {
        return res.status(400).send("Failed to reach target site");
      }
      throw e;
    }
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const url = (req.body.url || "").trim();
    const html = (req.body.html || "").trim();

    if (url) {
      try {
        const results = await clipUrl(url);
        return res.status(200).json(results);
      } catch (e) {
        if (e instanceof ClipTimeoutError || e instanceof ClipFetchError) {
          return res.status(400).send("Failed to reach target site");
        }
        throw e;
      }
    }

    if (html) {
      const results = await clipHtml(html);

      // Compatibility with old clients
      return res.status(200).json({
        ...results.recipe,
        imageURL: results.images[0] || "",
      });
    }

    return res.status(400).send("Must provide 'html' or 'url' in body");
  } catch (e) {
    next(e);
  }
});

export default router;
