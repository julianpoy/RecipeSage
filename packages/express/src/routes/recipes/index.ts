import express from "express";
import { recipesJsonLdHandler } from "./jsonLd";

const router = express.Router();

router.get("/:recipeId/json-ld", ...recipesJsonLdHandler);

export { router as recipesRouter };
