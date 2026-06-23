import express from "express";
import { authRouter } from "./auth";
import { clipRouter } from "./clip";
import { imageRouter } from "./image";
import { importRouter } from "./import";
import { mealPlansRouter } from "./mealPlans";
import { metricsRouter } from "./metrics";
import { wsRouter } from "./ws";
import { stripeRouter } from "./stripe";
import { printRouter } from "./print";
import { shareRouter } from "./share";
import { mlRouter } from "./ml";

const router = express.Router();

router.use("/auth", authRouter);
router.use("/clip", clipRouter);
router.use("/images", imageRouter);
router.use("/import", importRouter);
router.use("/mealplans", mealPlansRouter);
router.use("/metrics", metricsRouter);
router.use("/stripe", stripeRouter);
router.use("/print", printRouter);
router.use("/share", shareRouter);
router.use("/ws", wsRouter);
router.use("/ml", mlRouter);

export { router as typesafeExpressIndexRouter };
