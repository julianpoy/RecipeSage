import express from "express";
import { importRouter } from "./import";
import { mealPlansRouter } from "./mealPlans";
import { metricsRouter } from "./metrics";
import { wsRouter } from "./ws";
import { stripeRouter } from "./stripe";
import { printRouter } from "./print";

const router = express.Router();

router.use("/import", importRouter);
router.use("/mealplans", mealPlansRouter);
router.use("/metrics", metricsRouter);
router.use("/stripe", stripeRouter);
router.use("/print", printRouter);
router.use("/ws", wsRouter);

export { router as typesafeExpressIndexRouter };
