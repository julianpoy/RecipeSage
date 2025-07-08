import express from "express";
const router = express.Router();
import * as Sentry from "@sentry/node";
import semver from "semver";
import { prisma } from "@recipesage/prisma";

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

// Health information in JSON response
router.get("/health", async (req, res) => {
  const healthy = {
    prisma: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    healthy.prisma = true;
  } catch (_e) {
    // Do nothing
  }

  const status = Object.values(healthy).includes(false) ? 500 : 200;

  res.status(status).json(healthy);
});

// Health information for kube/monitoring
// 200 => healthy
// 500 => unhealthy, roll pod
router.get("/healthz", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).send("healthy");
  } catch (e) {
    res.status(500).send("unhealthy");
    Sentry.captureException(e);
  }
});

router.get("/embed/recipe/:recipeId", (req, res) => {
  res.redirect(
    302,
    `/api/print/${req.params.recipeId}${req._parsedUrl.search}`,
  );
});

export default router;
