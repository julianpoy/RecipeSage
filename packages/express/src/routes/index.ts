import express from "express";
import { importRouter } from "./import";
import { mealPlansRouter } from "./mealPlans";
import { metricsRouter } from "./metrics";
import { wsRouter } from "./ws";
import { stripeHandler } from "./stripe";

const router = express.Router();

router.use("/import", importRouter);
router.use("/mealplans", mealPlansRouter);
router.use("/metrics", metricsRouter);
router.use("/stripe", stripeHandler);
router.use("/ws", wsRouter);

export { router as typesafeExpressIndexRouter };
