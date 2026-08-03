import express from "express";
const router = express.Router();
import semver from "semver";

router.get("/", function (req, res) {
  res.render("index", { version: process.env.VERSION });
});

const MIN_SUPPORTED_FRONTEND_VERSION = ">=3.0.0";
router.get("/versioncheck", (req, res) => {
  let supported = false;
  if (req.query.version) {
    const version = semver.coerce(req.query.version);
    supported = semver.satisfies(version, MIN_SUPPORTED_FRONTEND_VERSION);
  }

  if (["development", "staging"].includes(req.query.version)) supported = true;

  res.status(200).json({
    supported,
  });
});

router.get("/embed/recipe/:recipeId", (req, res) => {
  res.redirect(
    302,
    `/api/print/recipe/${req.params.recipeId}${req._parsedUrl.search}`,
  );
});

export default router;
