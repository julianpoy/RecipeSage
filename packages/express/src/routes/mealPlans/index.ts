import express from "express";
import { mealPlansIcalHandler } from "./ical";

const router = express.Router();

router.get("/:mealPlanId/ical", ...mealPlansIcalHandler);

export { router as mealPlansRouter };
